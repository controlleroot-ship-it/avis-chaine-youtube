<?php
declare(strict_types=1);

function database(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $host = getenv('DB_HOST') ?: '';
    $database = getenv('DB_NAME') ?: '';
    $user = getenv('DB_USER') ?: '';
    $password = getenv('DB_PASSWORD') ?: '';
    $port = getenv('DB_PORT') ?: '3306';

    if ($host === '' || $database === '' || $user === '') {
        throw new RuntimeException('La connexion à la base de données n’est pas configurée.');
    }

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $database);
    $connection = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $connection;
}
