import zipfile
import sys

def main():
    path = "/home/vishabh/Downloads/SUH S1_19082025.xlsm"
    try:
        with zipfile.ZipFile(path, 'r') as z:
            print("Files inside zip:")
            for f in z.namelist():
                if "vba" in f.lower():
                    print("  Found VBA-related file:", f)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
