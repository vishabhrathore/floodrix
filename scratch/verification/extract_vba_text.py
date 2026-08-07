import sys

try:
    from oletools.olevba import VBA_Parser
    print("oletools is installed")
except ImportError:
    print("oletools is not installed. Installing...")
    import subprocess
    subprocess.check_call(["pip", "install", "--break-system-packages", "oletools"])
    from oletools.olevba import VBA_Parser
    print("oletools successfully installed")

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    vbaparser = VBA_Parser(path)
    if vbaparser.detect_vba_macros():
        print("VBA Macros detected!")
        for name, filename, stream_path, code in vbaparser.extract_macros():
            print("-" * 40)
            print(f"Macro Name: {name} (in stream {stream_path})")
            print("-" * 40)
            print(code)
            print("-" * 40)
    else:
        print("No VBA macros detected.")

if __name__ == "__main__":
    main()
