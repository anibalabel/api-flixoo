import React, { useState } from 'react';

const BackendCodeSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PHP' | 'HOSTING'>('PHP');
  const [copied, setCopied] = useState(false);

  const phpCode = `<?php
/**
 * REST API OXOOFLIX - plusmpzj_oxooflix
 * Generado con soporte para timestamps y formato JSON en IDs
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// Configuración de Base de Datos - Según requerimientos del usuario
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

// Helper para procesar la ruta
$path_info = isset($_SERVER['PATH_INFO']) ? $_SERVER['PATH_INFO'] : (isset($_SERVER['REQUEST_URI']) ? explode('?', $_SERVER['REQUEST_URI'])[0] : '');
$request = explode('/', trim($path_info, '/'));
// En algunos servidores el primer elemento puede ser el nombre del script si no hay rewrite
if (isset($request[0]) && strpos($request[0], '.php') !== false) {
    array_shift($request);
}

$resource = isset($request[0]) ? $request[0] : '';
$id = isset($request[1]) ? $request[1] : null;
$method = $_SERVER['REQUEST_METHOD'];

// Formato de fecha solicitado: 2026-01-08 16:41:59
date_default_timezone_set('UTC'); 
$now = date('Y-m-d H:i:s');

// --- RUTAS ---

// 1. TV SHOWS (Obtener: id, title, tmdb_id, thumbnail)
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
        $pdo->prepare("DELETE FROM tv_shows WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

// 2. SEASONS (Obtener: id, tv_show_id, slug, season_name, order, status)
elseif ($resource == 'seasons') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, tv_show_id, slug, season_name, \`order\`, status FROM seasons ORDER BY id DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } 
    elseif ($method == 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Requisito especial: tv_show_id guardado como ["1"]
        $raw_id = (string)$data['tv_show_id'];
        $tv_show_id = '["' . $raw_id . '"]';
        
        $sql = "INSERT INTO seasons (tv_show_id, slug, season_name, \`order\`, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($sql)->execute([
            $tv_show_id, 
            $data['slug'], 
            $data['season_name'], 
            $data['order'], 
            (int)$data['status'], 
            $now, 
            $now
        ]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    }
    elseif ($method == 'PUT' && $id) {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $raw_id = (string)$data['tv_show_id'];
        $tv_show_id = strpos($raw_id, '[') === false ? '["' . $raw_id . '"]' : $raw_id;
        
        $sql = "UPDATE seasons SET tv_show_id=?, slug=?, season_name=?, \`order\`=?, status=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([
            $tv_show_id, 
            $data['slug'], 
            $data['season_name'], 
            $data['order'], 
            (int)$data['status'], 
            $now, 
            $id
        ]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM seasons WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
}

// 3. EPISODES (Obtener: todos los campos solicitados)
elseif ($resource == 'episodes') {
    if ($method == 'GET') {
        $stmt = $pdo->query("SELECT id, season_id, series_id, episode_name, slug, description, file_source, source_type, file_url, \`order\`, runtime, poster, total_view FROM episodes ORDER BY id DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    elseif ($method == 'POST') {
        $d = json_decode(file_get_contents('php://input'), true);
        $sql = "INSERT INTO episodes (season_id, series_id, episode_name, slug, description, file_source, source_type, file_url, \`order\`, runtime, poster, total_view, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $pdo->prepare($sql)->execute([
            $d['season_id'], 
            $d['series_id'], 
            $d['episode_name'], 
            $d['slug'], 
            $d['description'], 
            $d['file_source'], 
            $d['source_type'], 
            $d['file_url'], 
            $d['order'], 
            $d['runtime'], 
            $d['poster'], 
            0, 
            $now, 
            $now
        ]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    }
    elseif ($method == 'PUT' && $id) {
        $d = json_decode(file_get_contents('php://input'), true);
        $sql = "UPDATE episodes SET season_id=?, series_id=?, episode_name=?, slug=?, description=?, file_source=?, source_type=?, file_url=?, \`order\`=?, runtime=?, poster=?, total_view=?, updated_at=? WHERE id=?";
        $pdo->prepare($sql)->execute([
            $d['season_id'], 
            $d['series_id'], 
            $d['episode_name'], 
            $d['slug'], 
            $d['description'], 
            $d['file_source'], 
            $d['source_type'], 
            $d['file_url'], 
            $d['order'], 
            $d['runtime'], 
            $d['poster'], 
            $d['total_view'], 
            $now, 
            $id
        ]);
        echo json_encode(["status" => "success"]);
    }
    elseif ($method == 'DELETE' && $id) {
        $pdo->prepare("DELETE FROM episodes WHERE id = ?")->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} else {
    http_response_code(404);
    echo json_encode(["error" => "Ruta no válida"]);
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
           <h3 className="text-xl font-bold text-white">Documentación API Rest</h3>
           <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mt-1">Implementación MySQL PDO</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-gray-800 text-indigo-400 hover:text-white border border-gray-700'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            {copied ? '¡Copiado!' : 'Copiar Código PHP'}
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-black/60 p-6 rounded-2xl border border-gray-800 overflow-x-auto max-h-[600px] custom-scrollbar">
          <pre className="text-xs text-indigo-300 font-mono leading-relaxed">
            <code>{phpCode}</code>
          </pre>
        </div>
        
        <div className="mt-6 p-6 bg-indigo-900/10 border border-indigo-500/20 rounded-2xl">
           <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
             <i className="fas fa-info-circle"></i> Notas de Implementación
           </h4>
           <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
             <li>El campo <b>tv_show_id</b> en la tabla <i>seasons</i> se guarda como un array JSON (Ej: <code className="text-indigo-300">["1"]</code>) según su solicitud.</li>
             <li>Los campos <b>created_at</b> y <b>updated_at</b> utilizan el formato de marca de tiempo completo.</li>
             <li>Asegúrese de subir el archivo <code className="text-white">api.php</code> a su servidor <code className="text-white">apiflixy.plusmovie.pw</code>.</li>
           </ul>
        </div>
      </div>
    </div>
  );
};

export default BackendCodeSection;