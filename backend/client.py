# https://www.google.com/search?q=python+simple+sock+cli+to+execute+shell+commands+from+one+container+to+another&client=firefox-b-1-d&sca_esv=b8281854a4bc4e84&ei=Xc0Gafe7F8_bkPIP49rikQQ&ved=0ahUKEwi33vjYwNKQAxXPLUQIHWOtOEIQ4dUDCBM&uact=5&oq=python+simple+sock+cli+to+execute+shell+commands+from+one+container+to+another&gs_lp=Egxnd3Mtd2l6LXNlcnAiTnB5dGhvbiBzaW1wbGUgc29jayBjbGkgdG8gZXhlY3V0ZSBzaGVsbCBjb21tYW5kcyBmcm9tIG9uZSBjb250YWluZXIgdG8gYW5vdGhlckjp6QFQAFjn3gFwAHgAkAEAmAFOoAHvA6oBATm4AQPIAQD4AQGYAgGgAjnCAgQQIRgKmAMAkgcBMaAHnxWyBwExuAc5wgcDMi0xyAcD&sclient=gws-wiz-serp


# client.py
import socket

HOST = 'dms'  # Replace with the server container's IP or hostname
PORT = 8888                               # Port the server is listening on

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((HOST, PORT))
    while True:
        command = input("Enter command to execute on server (or 'exit' to quit): ")
        if command.lower() == 'exit':
            break
        s.sendall(command.encode('utf-8'))
        data = s.recv(4096).decode('utf-8')
        print(f"Server response:\n{data}")