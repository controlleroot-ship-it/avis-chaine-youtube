<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function mysqlConnection(): ?PDO
{
    $configPath = getenv('AVIS_DB_CONFIG') ?: dirname(__DIR__, 2) . '/avis-communaute.config.php';
    $config = is_file($configPath) ? require $configPath : [];
    if (!is_array($config)) {
        throw new RuntimeException('Configuration MySQL invalide.');
    }
    $settings = [];
    foreach (['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'] as $key) {
        $environment = getenv($key);
        $settings[$key] = $environment === false ? ($config[$key] ?? null) : $environment;
        if ($settings[$key] !== null && !is_string($settings[$key])) {
            throw new RuntimeException('Configuration MySQL invalide.');
        }
    }
    $host = $settings['DB_HOST'];
    $database = $settings['DB_NAME'];
    $username = $settings['DB_USER'];
    $password = $settings['DB_PASSWORD'];
    if (!$host || !$database || !$username || $password === null) {
        if (defined('AVIS_PRODUCTION') && AVIS_PRODUCTION) {
            throw new RuntimeException('La production exige une base MySQL configurée.');
        }
        return null;
    }

    $port = $settings['DB_PORT'] ?: '3306';
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
        $username,
        $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    $pdo->exec('CREATE TABLE IF NOT EXISTS reviews (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        rating TINYINT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX reviews_created_at (created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    return $pdo;
}

function localReviewsPath(): string
{
    return sys_get_temp_dir() . '/avis-communaute-reviews.json';
}

function listLocalReviews(): array
{
    $handle = fopen(localReviewsPath(), 'c+');
    if (!$handle || !flock($handle, LOCK_SH)) {
        throw new RuntimeException('Stockage local indisponible.');
    }
    rewind($handle);
    $contents = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    $reviews = json_decode($contents ?: '[]', true);
    return is_array($reviews) ? $reviews : [];
}

function addLocalReview(array $review): array
{
    $handle = fopen(localReviewsPath(), 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) {
        throw new RuntimeException('Stockage local indisponible.');
    }
    rewind($handle);
    $reviews = json_decode(stream_get_contents($handle) ?: '[]', true);
    if (!is_array($reviews)) $reviews = [];
    array_unshift($reviews, $review);
    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($reviews, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    return $review;
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($path === '/health' && $method === 'GET') {
        if (defined('AVIS_PRODUCTION') && AVIS_PRODUCTION) {
            mysqlConnection()->query('SELECT 1');
        }
        respond(['status' => 'ok']);
    }

    if ($path !== '/api/reviews') {
        respond(['error' => 'Route introuvable.'], 404);
    }

    $pdo = mysqlConnection();
    if ($method === 'GET') {
        if ($pdo) {
            respond($pdo->query('SELECT id, name, rating, message, created_at FROM reviews ORDER BY created_at DESC, id DESC')->fetchAll());
        }
        respond(listLocalReviews());
    }

    if ($method !== 'POST') {
        header('Allow: GET, POST');
        respond(['error' => 'Méthode non autorisée.'], 405);
    }

    $input = json_decode(file_get_contents('php://input') ?: '', true);
    $name = trim((string) ($input['name'] ?? ''));
    $message = trim((string) ($input['message'] ?? ''));
    $rating = filter_var($input['rating'] ?? null, FILTER_VALIDATE_INT);
    if ($name === '' || strlen($name) > 80 || $message === '' || strlen($message) > 1400 || $rating === false || $rating < 1 || $rating > 5) {
        respond(['error' => 'Indiquez un prénom, un avis de 1 400 caractères maximum et une note de 1 à 5.'], 422);
    }

    if ($pdo) {
        $statement = $pdo->prepare('INSERT INTO reviews (name, rating, message) VALUES (:name, :rating, :message)');
        $statement->execute(['name' => $name, 'rating' => $rating, 'message' => $message]);
        $statement = $pdo->prepare('SELECT id, name, rating, message, created_at FROM reviews WHERE id = ?');
        $statement->execute([$pdo->lastInsertId()]);
        respond($statement->fetch(), 201);
    }

    respond(addLocalReview([
        'id' => bin2hex(random_bytes(8)),
        'name' => $name,
        'rating' => $rating,
        'message' => $message,
        'created_at' => date(DATE_ATOM),
    ]), 201);
} catch (Throwable $error) {
    error_log('Avis API: ' . $error->getMessage());
    respond(['error' => 'Le service est momentanément indisponible.'], 503);
}
