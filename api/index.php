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

try {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($path !== '/api/reviews') {
        respond(404, ['error' => 'Cette adresse n’existe pas.']);
    }

    if ($method === 'GET') {
        $sort = ($_GET['sort'] ?? 'recent') === 'top'
            ? 'rating DESC, created_at DESC'
            : 'created_at DESC';
        $reviews = database()->query("SELECT id, name, rating, message, created_at FROM reviews ORDER BY {$sort} LIMIT 200")->fetchAll();
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

        $statement = database()->prepare('INSERT INTO reviews (name, rating, message) VALUES (:name, :rating, :message)');
        $statement->execute(['name' => $name, 'rating' => $rating, 'message' => $message]);
        $select = database()->prepare('SELECT id, name, rating, message, created_at FROM reviews WHERE id = :id');
        $select->execute(['id' => database()->lastInsertId()]);
        respond(201, ['review' => $select->fetch()]);
    }

    header('Allow: GET, POST');
    respond(405, ['error' => 'Cette méthode n’est pas autorisée.']);
} catch (Throwable $error) {
    error_log('Reviews API error: ' . $error->getMessage());
    respond(503, ['error' => 'Le service est momentanément indisponible. Réessayez dans un instant.']);
}
