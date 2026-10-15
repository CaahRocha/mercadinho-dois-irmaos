Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Pega o caminho da pasta onde está o script
ScriptPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' Define variáveis de ambiente
WshShell.Environment("Process")("NODE_ENV") = "production"
WshShell.Environment("Process")("PORT") = "3001"

' Muda para a pasta do backend
WshShell.CurrentDirectory = ScriptPath & "\backend"

' Inicia o servidor Node em uma janela minimizada
WshShell.Run "cmd /k node src/server.js", 7, False

' Espera 4 segundos para o servidor iniciar
WScript.Sleep 4000

' Abre o Edge no endereco do sistema
WshShell.Run "msedge http://localhost:3001", 1, False

' Mostra mensagem
MsgBox "Sistema Mercadinho Dois Irmaos iniciado!" & vbCrLf & vbCrLf & "O sistema abriu no Microsoft Edge." & vbCrLf & vbCrLf & "NAO FECHE a janela preta do servidor enquanto estiver usando!", vbInformation, "Mercadinho Dois Irmaos"
