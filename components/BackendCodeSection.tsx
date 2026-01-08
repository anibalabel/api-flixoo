
import React, { useState } from 'react';

const BackendCodeSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PHP' | 'HOSTING'>('PHP');
  const [copied, setCopied] = useState(false);

  const phpCode = `<?php
/**
 * REST API OXOOFLIX - Archivo: api.php
 * Versión Final Corregida para Registro y Actualización
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

// Enrutador
$path_info = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : '';
if (empty($path_info)) {
    $script_name = $_SERVER['SCRIPT_NAME'];
    $request_uri = $_SERVER['REQUEST_URI'];
    $path_info = str_replace($script_name, '', $request_uri);
    $path_info = explode('?', $path_info)[0];
}

$request = explode('/', trim($path_info, '/'));
$resource = isset($request[0]) ? $request[0] : '';
$id = isset($request[1]) ? $request[1] : null;
$method = $_SERVER['REQUEST_METHOD'];

// Formato de fecha solicitado: 2026-01-08 16:41:59
date_default_timezone_set('America/Mexico_City'); 

// --- RUTAS ---

// 1. TV SHOWS
if ($resource == 'tv_shows') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, title, tmdb_id FROM tv_shows ORDER BY id DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
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
        
        // Formato ["1"] solicitado, evitando duplicar si ya viene así
        $raw_id = (string)$data['tv_show_id'];
        $tv_show_id = strpos($raw_id, '[') === false ? '["' . $raw_id . '"]' : $raw_id;
        
        $ts = date('Y-m-d H:i:s');
        $sql = "INSERT INTO seasons (tv_show_id, slug, season_name, \`order\`, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($sql)->execute([$tv_show_id, $data['slug'], $data['season_name'], $data['order'], (int)$data['status'], $ts, $ts]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    }
    elseif ($method == 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $raw_id = (string)$data['tv_show_id'];
        $tv_show_id = strpos($raw_id, '[') === false ? '["' . $raw_id . '"]' : $raw_id;
        
        $ts = date('Y-m-d H:i:s');
        $sql = "UPDATE seasons SET tv_show_id=?, slug=?, season_name=?, \`order\`=?, status=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([$tv_show_id, $data['slug'], $data['season_name'], $data['order'], (int)$data['status'], $ts, $id]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM seasons WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

// 3. EPISODES
elseif ($resource == 'episodes') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, season_id, series_id, episode_name, slug, description, file_source, source_type, file_url, \`order\`, runtime, poster, total_view FROM episodes ORDER BY \`order\` ASC");
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
        $sql = "UPDATE episodes SET season_id=?, series_id=?, episode_name=?, slug=?, description=?, file_source=?, source_type=?, file_url=?, \`order\`=?, runtime=?, poster=?, total_view=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([$d['season_id'], $d['series_id'], $d['episode_name'], $d['slug'], $d['description'], $d['file_source'], $d['source_type'], $d['file_url'], $d['order'], $d['runtime'], $d['poster'], $d['total_view'], $ts, $id]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM episodes WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} else {
    http_response_code(404);
    echo json_encode(["error" => "Ruta no encontrada"]);
}
?>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(phpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden animate-fadeIn">
      <div className="p-6 border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10 flex justify-between items-center">
        <div>
           <h3 className="text-xl font-bold text-white">API Implementación</h3>
           <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">MySQL + PDO + REST</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('PHP')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'PHP' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          >
            PHP API Code
          </button>
          <button 
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-indigo-400 hover:text-white'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? '¡Copiado!' : 'Copiar Código'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-black/40 p-4 rounded-xl border border-gray-800 overflow-x-auto max-h-[600px] scrollbar-thin">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed">
            <code>{phpCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default BackendCodeSection;
