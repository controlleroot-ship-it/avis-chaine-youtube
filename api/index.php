<?php
declare(strict_types=1);

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function characterCount(string $value): int
{
    return preg_match_all('/./us', $value) ?: 0;
}

function databaseIsConfigured(): bool
{
    return getenv('DB_HOST') !== false && getenv('DB_HOST') !== ''
        && getenv('DB_NAME') !== false && getenv('DB_NAME') !== ''
        && getenv('DB_USER') !== false && getenv('DB_USER') !== '';
}

function fileStore(callable $operation, bool $write = false): mixed
{
    $path = sys_get_temp_dir() . '/avis-chaine-reviews-' . hash('sha256', __DIR__) . '.json';
    $lock = fopen($path . '.lock', 'c+');
    if ($lock === false) {
        throw new RuntimeException('Le stockage des avis est indisponible.');
    }
    if (!flock($lock, $write ? LOCK_EX : LOCK_SH)) {
        fclose($lock);
        throw new RuntimeException('Le stockage des avis est indisponible.');
    }

    try {
        $reviews = is_file($path)
            ? json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR)
            : [];
        if (!is_array($reviews) || !array_is_list($reviews)) {
            throw new RuntimeException('Le stockage des avis est invalide.');
        }

        [$updatedReviews, $result] = $operation($reviews);
        if ($write) {
            $temporaryPath = $path . '.' . bin2hex(random_bytes(6)) . '.tmp';
            $encoded = json_encode($updatedReviews, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (file_put_contents($temporaryPath, $encoded) === false || !rename($temporaryPath, $path)) {
                @unlink($temporaryPath);
                throw new RuntimeException('Impossible d’enregistrer cet avis.');
            }
            chmod($path, 0600);
        }

        return $result;
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

try {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($path !== '/api/reviews') {
        respond(404, ['error' => 'Cette adresse n’existe pas.']);
    }

    if ($method === 'GET') {
        $sortByRating = ($_GET['sort'] ?? 'recent') === 'top';
        if (databaseIsConfigured()) {
            $sort = $sortByRating ? 'rating DESC, created_at DESC' : 'created_at DESC';
            $reviews = database()->query("SELECT id, name, rating, message, created_at FROM reviews ORDER BY {$sort} LIMIT 200")->fetchAll();
        } else {
            $reviews = fileStore(static fn (array $saved): array => [$saved, $saved]);
            usort($reviews, static function (array $left, array $right) use ($sortByRating): int {
                if ($sortByRating && (int) $left['rating'] !== (int) $right['rating']) {
                    return (int) $right['rating'] <=> (int) $left['rating'];
                }
                return strcmp($right['created_at'], $left['created_at']) ?: ((int) $right['id'] <=> (int) $left['id']);
            });
            $reviews = array_slice($reviews, 0, 200);
        }
        respond(200, ['reviews' => $reviews]);
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input') ?: '', true);
        if (!is_array($input)) {
            respond(400, ['error' => 'Le formulaire est invalide.']);
        }
        $name = trim((string) ($input['name'] ?? ''));
        $message = trim((string) ($input['message'] ?? ''));
        $rating = filter_var($input['rating'] ?? null, FILTER_VALIDATE_INT);

        if ($name === '' || characterCount($name) > 60) {
            respond(422, ['error' => 'Le prénom doit contenir entre 1 et 60 caractères.']);
        }
        if ($message === '' || characterCount($message) > 800) {
            respond(422, ['error' => 'Votre avis doit contenir entre 1 et 800 caractères.']);
        }
        if ($rating === false || $rating < 1 || $rating > 5) {
            respond(422, ['error' => 'Choisissez une note entre 1 et 5 étoiles.']);
        }

        if (databaseIsConfigured()) {
            $statement = database()->prepare('INSERT INTO reviews (name, rating, message) VALUES (:name, :rating, :message)');
            $statement->execute(['name' => $name, 'rating' => $rating, 'message' => $message]);
            $select = database()->prepare('SELECT id, name, rating, message, created_at FROM reviews WHERE id = :id');
            $select->execute(['id' => database()->lastInsertId()]);
            $review = $select->fetch();
        } else {
            $review = fileStore(static function (array $reviews) use ($name, $rating, $message): array {
                $nextId = $reviews ? max(array_map(static fn (array $review): int => (int) $review['id'], $reviews)) + 1 : 1;
                $review = [
                    'id' => $nextId,
                    'name' => $name,
                    'rating' => $rating,
                    'message' => $message,
                    'created_at' => gmdate('Y-m-d H:i:s'),
                ];
                array_unshift($reviews, $review);
                return [$reviews, $review];
            }, true);
        }
        respond(201, ['review' => $review]);
    }

    header('Allow: GET, POST');
    respond(405, ['error' => 'Cette méthode n’est pas autorisée.']);
} catch (Throwable $error) {
    error_log('Reviews API error: ' . $error->getMessage());
    respond(503, ['error' => 'Le service est momentanément indisponible. Réessayez dans un instant.']);
}
