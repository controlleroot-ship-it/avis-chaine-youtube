<?php
declare(strict_types=1);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/') {
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'ok']);
    return true;
}

if ($path === '/health') {
    require __DIR__ . '/db.php';
    try {
        database()->query('SELECT 1');
        http_response_code(200);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'ok']);
    } catch (Throwable $error) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['status' => 'database_unavailable']);
    }
    return true;
}

require __DIR__ . '/index.php';
