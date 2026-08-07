Attribute VB_Name = "Module3"
Option Explicit

Private Const END_ROW As Long = 193  ' <-- BW totals and evaluation go down to this row

Sub The72hrBlockOrder_Final()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("72hr SPS  ")   ' <-- adjust if needed
    
    Dim blocks(1 To 6, 1 To 12) As Double
    Dim i As Long, j As Long
    
    ' === Load block values (6 blocks × 12): V36:AA47
    For i = 1 To 12
        blocks(1, i) = ws.Cells(35 + i, 22).Value ' V
        blocks(2, i) = ws.Cells(35 + i, 23).Value ' W
        blocks(3, i) = ws.Cells(35 + i, 24).Value ' X
        blocks(4, i) = ws.Cells(35 + i, 25).Value ' Y
        blocks(5, i) = ws.Cells(35 + i, 26).Value ' Z
        blocks(6, i) = ws.Cells(35 + i, 27).Value ' AA
    Next i
    
    ' === Find lastRow in Column B (stop at 2nd zero starting from B53; include that row)
    Dim lastRow As Long, zeroCount As Long
    zeroCount = 0
    For i = 53 To ws.Rows.count
        If ws.Cells(i, 2).Value = 0 Then
            zeroCount = zeroCount + 1
            If zeroCount = 2 Then
                lastRow = i
                Exit For
            End If
        End If
        If i > 5000 Then Exit For
    Next i
    If lastRow = 0 Then
        lastRow = ws.Cells(ws.Rows.count, 2).End(xlUp).row
        If lastRow < 53 Then
            MsgBox "No multipliers found from B53 downward.", vbExclamation
            Exit Sub
        End If
    End If
    
    ' === Load multipliers B53:BlastRow into 1-based array (1..N)
    Dim multipliers() As Double
    Dim countN As Long: countN = lastRow - 52
    ReDim multipliers(1 To countN)
    For i = 1 To countN
        multipliers(i) = ws.Cells(52 + i, 2).Value
    Next i
    
    ' === Prepare permutations (6 blocks)
    Dim arr As Variant
    arr = Array(1, 2, 3, 4, 5, 6)
    
    Dim bestVal As Double: bestVal = -1E+30
    Dim bestPerm As Variant
    Dim bestRow As Long
    Dim bestTraceRow As Long
    
    ' === Trace table (BZ:CC)
    ws.Range("BZ52:CC800").ClearContents
    ws.Range("BZ52:CC52").Value = Array("Seq#", "Block Order", "Max BW", "Row")
    Dim traceRow As Long: traceRow = 53
    
    ' === Evaluate all permutations with tracing (evaluation uses END_ROW)
    PermuteEval72 arr, 0, 5, blocks, multipliers, bestVal, bestPerm, bestRow, ws, traceRow, bestTraceRow
    
    ' === Clear old output areas (only what we will rewrite)
    ws.Range("C53:BV" & END_ROW).ClearContents
    ws.Range("BW53:BW" & END_ROW).ClearContents
    ws.Range("BW53:BW" & END_ROW).Interior.ColorIndex = xlNone
    ws.Range("BW53:BW" & END_ROW).Font.Bold = False
    
    ' === Write best order into Row 52 (C:BV, 72 values)
    Dim col As Long, blockIndex As Long
    col = 3 ' C
    For blockIndex = LBound(bestPerm) To UBound(bestPerm)
        For j = 1 To 12
            ws.Cells(52, col).Value = blocks(bestPerm(blockIndex), j)
            col = col + 1
        Next j
    Next blockIndex
    
    ' === Staggered multiplication into C53:BV, computed down to END_ROW
    Dim startRow As Long, r As Long
    For col = 3 To 3 + 71 ' C to BV
        startRow = 53 + (col - 3) ' each next column starts one row lower
        If startRow <= END_ROW Then
            For r = startRow To END_ROW
                Dim mIdx As Long
                mIdx = (r - 52) - (col - 3)  ' corresponds to B53.. as 1..N
                If mIdx >= 1 And mIdx <= countN Then
                    ws.Cells(r, col).Value = ws.Cells(52, col).Value * multipliers(mIdx)
                End If
            Next r
        End If
    Next col
    
    ' === Row totals into BW (sum C:BV) from 53 to END_ROW
    Dim rowSum As Double, maxRowIdx As Long
    bestVal = -1E+30
    For r = 53 To END_ROW
        rowSum = Application.Sum(ws.Range(ws.Cells(r, 3), ws.Cells(r, 74))) ' C:BV
        ws.Cells(r, 75).Value = rowSum                                     ' BW
        If rowSum > bestVal Then
            bestVal = rowSum
            maxRowIdx = r
        End If
    Next r
    
    ' === Highlight the best BW cell (yellow + bold)
    With ws.Cells(maxRowIdx, 75)
        .Interior.Color = vbYellow
        .Font.Bold = True
    End With
    
    ' === Report order & max at D45:D46
    ws.Range("D45").Value = "Best order: B" & Join(bestPerm, ", B")
    ws.Range("D46").Value = "Max BW (rows 53–" & END_ROW & ") = " & bestVal & " (at BW" & maxRowIdx & ")"
    
    ' === Highlight the winning permutation row in the trace table (green + bold)
    If bestTraceRow >= 53 Then
        With ws.Range(ws.Cells(bestTraceRow, 78), ws.Cells(bestTraceRow, 81)) ' BZ..CC
            .Interior.Color = vbGreen
            .Font.Bold = True
        End With
    End If
    
    ' Optional: AutoFit trace table for readability
    ws.Range("BZ:CC").Columns.AutoFit
End Sub

' -------- Permutation engine with tracing --------
Private Sub PermuteEval72(arr As Variant, l As Long, r As Long, _
                          blocks As Variant, multipliers As Variant, _
                          ByRef bestVal As Double, ByRef bestPerm As Variant, ByRef bestRow As Long, _
                          ws As Worksheet, ByRef traceRow As Long, ByRef bestTraceRow As Long)
    Dim i As Long, maxRowVal As Double, rowIdx As Long, seqString As String
    
    If l = r Then
        maxRowVal = EvaluateOrder72(arr, blocks, multipliers, rowIdx)
        
        seqString = "B" & arr(0) & "-B" & arr(1) & "-B" & arr(2) & "-B" & arr(3) & "-B" & arr(4) & "-B" & arr(5)
        ws.Cells(traceRow, 78).Value = traceRow - 52   ' Seq#
        ws.Cells(traceRow, 79).Value = seqString       ' Block Order
        ws.Cells(traceRow, 80).Value = maxRowVal       ' Max BW
        ws.Cells(traceRow, 81).Value = "BW" & rowIdx   ' Row of Max
        
        If maxRowVal > bestVal Then
            bestVal = maxRowVal
            bestPerm = CloneVariant1D(arr)
            bestRow = rowIdx
            bestTraceRow = traceRow
        End If
        
        traceRow = traceRow + 1
    Else
        For i = l To r
            Swap arr(l), arr(i)
            PermuteEval72 arr, l + 1, r, blocks, multipliers, bestVal, bestPerm, bestRow, ws, traceRow, bestTraceRow
            Swap arr(l), arr(i)
        Next i
    End If
End Sub

' -------- Evaluate one permutation (rows 53..END_ROW) --------
Private Function EvaluateOrder72(order As Variant, blocks As Variant, multipliers As Variant, _
                                 ByRef bestRowIdx As Long) As Double
    Dim rowVals(1 To 72) As Double
    Dim col As Long, blockIndex As Long, j As Long
    Dim i As Long, offset As Long
    Dim rowSum As Double
    Dim maxRowValue As Double
    Dim maxRow As Long
    Dim countN As Long: countN = UBound(multipliers)
    
    ' Build Row 52 sequence (72 values)
    col = 1
    For blockIndex = LBound(order) To UBound(order)
        For j = 1 To 12
            rowVals(col) = blocks(order(blockIndex), j)
            col = col + 1
        Next j
    Next blockIndex
    
    ' Simulate staggered row totals from row 53 to END_ROW
    maxRowValue = -1E+30
    For i = 1 To (END_ROW - 52)
        rowSum = 0
        For col = 1 To 72
            offset = col - 1
            ' multiplier index for this cell in row i:
            If (i - offset) >= 1 And (i - offset) <= countN Then
                rowSum = rowSum + rowVals(col) * multipliers(i - offset)
            End If
        Next col
        If rowSum > maxRowValue Then
            maxRowValue = rowSum
            maxRow = i + 52   ' convert to sheet row index
        End If
    Next i
    
    bestRowIdx = maxRow
    EvaluateOrder72 = maxRowValue
End Function

' -------- Helpers --------
Private Function CloneVariant1D(a As Variant) As Variant
    Dim i As Long, tmp As Variant
    ReDim tmp(LBound(a) To UBound(a))
    For i = LBound(a) To UBound(a)
        tmp(i) = a(i)
    Next i
    CloneVariant1D = tmp
End Function

Private Sub Swap(a As Variant, b As Variant)
    Dim t As Variant
    t = a
    a = b
    b = t
End Sub


