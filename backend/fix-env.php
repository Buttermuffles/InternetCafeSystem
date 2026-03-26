<?php
$envPath = __DIR__ . '/.env';
$content = file_get_contents($envPath);
$content = str_replace('DB_CONNECTION=mysql', '# DB_CONNECTION=mysql', $content);
$content = str_replace('DB_HOST=127.0.0.1', '# DB_HOST=127.0.0.1', $content);
$content = str_replace('DB_PORT=3306', '# DB_PORT=3306', $content);
$content = str_replace('DB_DATABASE=internet_cafe_monitor', '# DB_DATABASE=internet_cafe_monitor', $content);
$content = str_replace('DB_USERNAME=root', '# DB_USERNAME=root', $content);
// We won't strictly match DB_PASSWORD= because it might have a space or not
$content = preg_replace('/DB_PASSWORD=.*\n/', "# DB_PASSWORD= \n", $content);

file_put_contents($envPath, $content);
echo "Env fixed!";
