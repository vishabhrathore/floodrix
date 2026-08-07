import openpyxl

wb = openpyxl.load_workbook("/home/vishabh/Downloads/SUH S1_19082025.xlsm", data_only=True)
sheet = wb["SUH"]
print("Workbook loaded successfully.")

# Let's print rows 17 to 35 in columns V and W (or where the profile is)
# "The datum should be the lowest RL in the profile (which in a stream flowing downstream is the last point). Actually looking more carefully at the Excel — $V$19 = 497 is the RL at chainage 0 (source), and Di is computed as source_RL - current_RL, so Di increases downstream."
# Let's inspect cells in column V and W from row 19 onwards.
print("Row | Col V (RL?) | Col W (Chainage?) | Col X (Di?)")
for r in range(19, 40):
    val_v = sheet.cell(row=r, column=22).value  # Col V is 22
    val_w = sheet.cell(row=r, column=23).value  # Col W is 23
    val_x = sheet.cell(row=r, column=24).value  # Col X is 24
    val_y = sheet.cell(row=r, column=25).value  # Col Y is 25
    val_z = sheet.cell(row=r, column=26).value  # Col Z is 26
    print(f"Row {r}: V={val_v}, W={val_w}, X={val_x}, Y={val_y}, Z={val_z}")
