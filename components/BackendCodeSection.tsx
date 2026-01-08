
import React, { useState } from 'react';

const BackendCodeSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PHP' | 'NODE' | 'HOSTING'>('PHP');
  const [copied, setCopied] = useState(false);

  const phpCode = `<?php
/**
 * REST API OXOOFLIX - Archivo: api.php
 * Versión Corregida y Robusta
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// Configuración de Base de Datos
$db_host = "localhost";
$db_port = 3306;
$db_database = "plusmpzj_oxooflix";
$db_username = "plusmpzj_oxooflix";
$db_password = "50830308xS/@";

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_database", $db_username, $db_password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec("set names utf8");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
    exit;
}

// Enrutador Robusto
$path_info = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
if (empty($path_info)) {
    // Intento alternativo para servidores sin PATH_INFO configurado
    $script_name = $_SERVER['SCRIPT_NAME'];
    $request_uri = $_SERVER['REQUEST_URI'];
    $path_info = str_replace($script_name, '', $request_uri);
    $path_info = explode('?', $path_info)[0]; // Limpiar query strings
}

$request = explode('/', trim($path_info, '/'));
$resource = isset($request[0]) ? $request[0] : '';
$id = isset($request[1]) ? $request[1] : null;
$method = $_SERVER['REQUEST_METHOD'];

// --- RUTAS ---

// 1. TV SHOWS
if ($resource == 'tv_shows') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, title, tmdb_id, thumbnail FROM tv_shows ORDER BY id DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($method == 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "INSERT INTO tv_shows (title, tmdb_id, thumbnail) VALUES (?, ?, ?)";
        $pdo->prepare($sql)->execute([$data['title'], $data['tmdb_id'], $data['thumbnail']]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    }
    elseif ($method == 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        $sql = "UPDATE tv_shows SET title=?, tmdb_id=?, thumbnail=? WHERE id=?";
        $pdo->prepare($sql)->execute([$data['title'], $data['tmdb_id'], $data['thumbnail'], $id]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        // Cascada manual para asegurar limpieza
        $pdo->prepare("DELETE FROM episodes WHERE series_id = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM seasons WHERE tv_show_id LIKE ?")->execute(['%"'.$id.'"%']);
        $pdo->prepare("DELETE FROM tv_shows WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success", "message" => "Serie y dependencias eliminadas"]);
    }
}

// 2. SEASONS
elseif ($resource == 'seasons') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, tv_show_id, slug, season_name, \`order\`, status FROM seasons ORDER BY \`order\` ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } 
    elseif ($method == 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $tv_show_id = '["' . $data['tv_show_id'] . '"]';
        $ts = date('Y-m-d H:i:s');
        $sql = "INSERT INTO seasons (tv_show_id, slug, season_name, \`order\`, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($sql)->execute([$tv_show_id, $data['slug'], $data['season_name'], $data['order'], $data['status'], $ts, $ts]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    }
    elseif ($method == 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        $tv_show_id = '["' . $data['tv_show_id'] . '"]';
        $ts = date('Y-m-d H:i:s');
        $sql = "UPDATE seasons SET tv_show_id=?, slug=?, season_name=?, \`order\`, status=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([$tv_show_id, $data['slug'], $data['season_name'], $data['order'], $data['status'], $ts, $id]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        // Eliminar episodios de esta temporada primero
        $pdo->prepare("DELETE FROM episodes WHERE season_id = ?")->execute([$id]);
        // Eliminar la temporada (CORREGIDO: se añadió el $ faltante)
        $pdo->prepare("DELETE FROM seasons WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

// 3. EPISODES
elseif ($resource == 'episodes') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT * FROM episodes ORDER BY \`order\` ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($method == 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $ts = date('Y-m-d H:i:s');
        $sql = "INSERT INTO episodes (season_id, series_id, episode_name, slug, description, file_source, source_type, file_url, \`order\`, runtime, poster, total_view, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($sql)->execute([$d['season_id'], $d['series_id'], $d['episode_name'], $d['slug'], $d['description'], $d['file_source'], $d['source_type'], $d['file_url'], $d['order'], $d['runtime'], $d['poster'], 0, $ts, $ts]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'PUT' && $id) {
        $d = json_decode(file_get_contents('php://input'), true);
        $ts = date('Y-m-d H:i:s');
        $sql = "UPDATE episodes SET season_id=?, series_id=?, episode_name=?, slug=?, description=?, file_source=?, source_type=?, file_url=?, \`order\`, runtime=?, poster=?, total_view=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([$d['season_id'], $d['series_id'], $d['episode_name'], $d['slug'], $d['description'], $d['file_source'], $d['source_type'], $d['file_url'], $d['order'], $d['runtime'], $d['poster'], $d['total_view'], $ts, $id]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM episodes WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} else {
    http_response_code(404);
    echo json_encode(["error" => "Ruta no encontrada", "path" => $path_info]);
}
?>`;

  const nodeCode = `// Código Node.js simplificado...`;

  const handleCopy = () => {
    const code = activeTab === 'PHP' ? phpCode : nodeCode;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10">
        <h3 className="text-xl font-bold text-white mb-4">Implementación y Despliegue</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveTab('PHP')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'PHP' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            Código PHP (CORREGIDO)
          </button>
          <button 
            onClick={() => setActiveTab('HOSTING')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'HOSTING' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-green-900/20'}`}
          >
            <i className="fas fa-server mr-2"></i>Guía Despliegue
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="relative group">
          <button 
            onClick={handleCopy}
            className={`absolute top-4 right-4 z-20 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xl ${
              copied ? 'bg-green-600 text-white' : 'bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30'
            }`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? '¡Copiado!' : 'Copiar Código'}
          </button>
          <div className="bg-black/40 p-4 rounded-xl border border-gray-800 overflow-x-auto max-h-[600px]">
            <pre className="text-sm text-indigo-300 font-mono leading-relaxed">
              <code>{activeTab === 'PHP' ? phpCode : nodeCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackendCodeSection;
