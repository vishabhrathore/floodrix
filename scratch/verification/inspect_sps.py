import openpyxl

wb = openpyxl.load_workbook("/home/vishabh/Downloads/SUH S1_19082025.xlsm", data_only=True)
sheet = wb["24hr SPS"]
print("Workbook loaded successfully.")

# Let's print rows 15 to 48 in columns H, I, L, M, N, O
print("Row | Col H (UH?) | Col I (Rain?) | Col L (Excess?) | Col N (Reversed?) | Col O")
for r in range(15, 48):
    val_h = sheet.cell(row=r, column=8).value  # Col H is 8
    val_i = sheet.cell(row=r, column=9).value  # Col I is 9
    val_l = sheet.cell(row=r, column=12).value  # Col L is 12
    val_n = sheet.cell(row=r, column=14).value  # Col N is 14
    val_o = sheet.cell(row=r, column=15).value  # Col O is 15
    print(f"Row {r:02d}: H={val_h}, I={val_i}, L={val_l}, N={val_n}, O={val_o}")
