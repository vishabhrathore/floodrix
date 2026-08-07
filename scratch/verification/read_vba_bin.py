import zipfile
import io

try:
    import olefile
    print("olefile is installed")
except ImportError:
    print("olefile is not installed")
    import subprocess
    subprocess.check_call(["pip", "install", "olefile"])
    import olefile
    print("olefile successfully installed")

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    with zipfile.ZipFile(path, 'r') as z:
        vba_data = z.read("xl/vbaProject.bin")
    
    f = io.BytesIO(vba_data)
    ole = olefile.OleFileIO(f)
    print("Streams in VBA project:")
    for stream in ole.listdir():
        print("  Stream:", "/".join(stream))
        
if __name__ == "__main__":
    main()
