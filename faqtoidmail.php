<?
/*
Requires a non-empty field named 'message'.
*/

$recipient = 'PUT_YOUR_EMAIL_ADDRESS@HERE.COM'; 

header("Access-Control-Allow-Origin: *"); 
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { # Access-Control headers are received during OPTIONS requests
    #if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
    header("Access-Control-Allow-Methods: POST, OPTIONS"); #GET, POST, OPTIONS");         
    #if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: ${_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    die;
}

header('Content-Type: application/json');

if (($email = trim($_POST['email'])) && trim($_POST['message'])) {
    if (strlen($email) < 60 && preg_match('/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/', $email) && $email != 'sample@email.tst') {
        $message = <<<EOT
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Support Message</title>
<style>
body {
    font-family: sans-serif; 
    font-size: 16pt; 
    max-width: 800px; 
    margin: 1em auto;
    padding-left: 1em;
    padding-right: 1em;
}
.extra {
    font-size: small;
}
</style>
</head>
<body>
EOT;
        function format($k, $v) {
            return "\n<p class=extra><b>$k</b> " . stripslashes(trim($v));
        }
        while (list($key, $value) = each($_POST))
            if ($key != 'email') {
                if (preg_match('/href=/i', $value))
                    die;
                if ($key == 'message')
                    $message .= preg_replace('/[\r\n]+/', '<p>', stripslashes(trim($value))) . "\n<hr>\n";
                else
                    $message .= format($key, $value);
            }
        $message .= format('Remote IP', $_SERVER['REMOTE_ADDR']);
        $message .= format('Mail script', 'http' . ($_SERVER['HTTPS'] ? 's' : '') . "://${_SERVER['HTTP_HOST']}${_SERVER['REQUEST_URI']}");
        $message .= '</body></html>';
        #$message .= "\nUser-agent: ${_SERVER['HTTP_USER_AGENT']}\nReferrer: ${_SERVER['HTTP_REFERER']}";
        preg_match('/^(www\.)?(.*)/i', strtolower($_SERVER['HTTP_HOST']), $matches);
        $subject = "${matches[2]} Message";# . date('M ' /*'Y-m-d H:i:s'*/); # set the subject here, for convenience & security
        $headers = "From: $email\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=iso-8859-1\r\n";
        $result = mail($recipient, $subject, $message, $headers);
        echo json_encode(array('success' => $result));
    } else
        echo json_encode(array('error' => 'invalid email'));
} else
    echo json_encode(array('success' => 0));
?>
