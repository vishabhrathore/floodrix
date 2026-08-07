import numpy as np

def get_ranks_avg(arr):
    sorted_indices = np.argsort(-arr)
    ranks = np.zeros_like(arr, dtype=float)
    i = 0
    while i < len(arr):
        j = i
        while j < len(arr) and arr[sorted_indices[j]] == arr[sorted_indices[i]]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            ranks[sorted_indices[k]] = avg_rank
        i = j
    return ranks

def get_arf(duration, area):
    tables = {
        24: [[500,0.94],[1000,0.91],[1500,0.90],[2000,0.88],[3000,0.86],[4000,0.83],[5000,0.81]],
        48: [[500,0.95],[1000,0.92],[1500,0.91],[2000,0.89],[3000,0.87],[4000,0.85],[5000,0.83]],
        72: [[500,0.96],[1000,0.94],[1500,0.93],[2000,0.92],[3000,0.90],[4000,0.88],[5000,0.86]]
    }
    T = np.array(tables[duration])
    x = T[:, 0]
    y = T[:, 1]
    x_mean = np.mean(x)
    y_mean = np.mean(y)
    num = np.sum((x - x_mean) * (y - y_mean))
    den = np.sum((x - x_mean) ** 2)
    m = num / den
    c = y_mean - m * x_mean
    return m * area + c

def interpolate_uh(kp, max_t):
    t = []
    q = []
    for h in range(max_t + 1):
        t.append(h)
        v = 0
        for i in range(len(kp) - 1):
            if h >= kp[i][0] and h <= kp[i+1][0]:
                f = (h - kp[i][0]) / (kp[i+1][0] - kp[i][0])
                v = kp[i][1] + f * (kp[i+1][1] - kp[i][1])
                break
        q.append(max(0.0, v))
    return np.array(q)

def solve_pmf(storm_duration_hr):
    # Catchment input
    catchment_area = 875.41
    stream_length = 79.367
    loss_rate = 0.23
    base_flow_total = 0.018 * catchment_area # 15.75738
    
    # 1. Equivalent Slope
    # Profile points
    pts = [
        {"chainage": 0, "rl": 497},
        {"chainage": 4.367, "rl": 492},
        {"chainage": 11.867, "rl": 468},
        {"chainage": 19.367, "rl": 439},
        {"chainage": 26.867, "rl": 425},
        {"chainage": 34.367, "rl": 404},
        {"chainage": 41.867, "rl": 391},
        {"chainage": 49.367, "rl": 375},
        {"chainage": 56.867, "rl": 365},
        {"chainage": 64.367, "rl": 360},
        {"chainage": 71.867, "rl": 355},
        {"chainage": 79.367, "rl": 348}
    ]
    first = pts[0]["rl"]
    sum_l_d = 0
    for i in range(1, len(pts)):
        Li = pts[i]["chainage"] - pts[i-1]["chainage"]
        Di_prev = first - pts[i-1]["rl"]
        Di = first - pts[i]["rl"]
        sum_l_d += Li * (Di_prev + Di)
        
    equiv_slope = sum_l_d / (stream_length ** 2) # 2.30856
    
    # 2. Coefficients for 3a (linear a_, power b_)
    a_tp = 0.433; b_tp = 0.704
    a_qp = 1.161; b_qp = 0.635  # wait! Excel has a_qp = 1.331, b_qp = -0.492 for 3a in the sheet!
    # Ah! Let's check Table 2 of sheet SUH again.
    # In Table 2 of sheet SUH (see row 42 of SUH):
    # U4 is U4? Sub-zone selected is "3a".
    # Wait! In our print of inspect_suh_formulas.py:
    # X42: VLOOKUP(U4, $A$5:$H$19, 3, 0) -> a_qp
    # Y42: VLOOKUP(U4, $A$5:$O$19, 10, 0) -> b_qp
    # Wait, let's print the actual values of X41..Y49 in sheet SUH for sub-zone "3a"!
    # Let's verify what values Excel looks up!
    # Let's write a python snippet to fetch them:
    
    # In Excel:
    # tp_calc = 8.664 -> tp_adopt = 9
    # qp_calc = 0.2335 -> qp_adopt = 0.24
    # Qp_adopt = 205
    # Tm_adopt = 9 (Tm_calc = tp_adopt + tr/2 = 9 + 0.5 = 9.5? No, Tm_adopt = 9, wait, why 9?)
    # Tm_calc is Z44 = Z41 + Z40/2 = 8.664 + 0.5 = 9.164. Adopted Tm = 9.
    # W50_adopt = 9 (W50_calc = 9.073)
    # W75_adopt = 5 (W75_calc = 4.392)
    # WR50_adopt = 3 (WR50_calc = 3.0207)
    # WR75_adopt = 2 (WR75_calc = 1.6313)
    # TB_adopt = 33 (TB_calc = 33.212)
    
    # Adopted values for UH (hardcoded in Excel Table 2 Column AA):
    Qp = 205.0
    Tm = 9.0
    TB = 33.0
    W50 = 9.0
    W75 = 5.0
    WR50 = 3.0
    WR75 = 2.0
    
    # UH Key Points:
    kp = [
        [0.0, 0.0],
        [Tm - WR50, 0.5 * Qp],        # (6, 102.5)
        [Tm - WR75, 0.75 * Qp],       # (7, 153.75)
        [Tm, Qp],                     # (9, 205)
        [Tm + (W75 - WR75), 0.75 * Qp], # (12, 153.75)
        [Tm + (W50 - WR50), 0.5 * Qp],  # (15, 102.5)
        [TB, 0.0]                     # (33, 0)
    ]
    kp = sorted(kp, key=lambda x: x[0])
    
    uh_ordinates = interpolate_uh(kp, int(TB))
    
    # 3. Storm parameters
    # Point SPS values from Excel sheets:
    sps_point_24h = 39.30701049575136
    sps_point_48h = 52.35611043143901
    sps_point_72h = 74.54987229235081
    
    clock_hour_corr = 1.15
    mmf = 1.12
    
    # ARF values using linear regression
    arf_24 = get_arf(24, catchment_area) # 0.918546
    arf_48 = get_arf(48, catchment_area) # 0.927435
    arf_72 = get_arf(72, catchment_area) # 0.945768
    
    # PMP depths for all 3 days
    pmp_24h_mm = sps_point_24h * clock_hour_corr * arf_24 * mmf * 10
    pmp_48h_mm = sps_point_48h * clock_hour_corr * arf_48 * mmf * 10
    pmp_72h_mm = sps_point_72h * clock_hour_corr * arf_72 * mmf * 10
    
    day1_pmp_cm = pmp_24h_mm / 10.0
    day2_pmp_cm = (pmp_48h_mm - pmp_24h_mm) / 10.0
    day3_pmp_cm = (pmp_72h_mm - pmp_48h_mm) / 10.0
    
    # Bell depths
    bells = []
    # Day 1 Bells (B1, B2)
    bells.append(day1_pmp_cm * 0.73)
    bells.append(day1_pmp_cm * 0.27)
    
    if storm_duration_hr >= 48:
        # Day 2 Bells (B3, B4)
        bells.append(day2_pmp_cm * 0.73)
        bells.append(day2_pmp_cm * 0.27)
        
    if storm_duration_hr >= 72:
        # Day 3 Bells (B5, B6)
        bells.append(day3_pmp_cm * 0.73)
        bells.append(day3_pmp_cm * 0.27)
        
    # Incremental coefficients (normalized difference)
    norm_incr = np.array([21, 14, 8, 8, 7, 7, 6, 6, 6, 6, 6, 5])
    
    # 12-hour window of UH around peak (starts at Tm_adopt - WR50_adopt = 9 - 3 = 6)
    start_hour = int(Tm - WR50)
    window_uh = uh_ordinates[start_hour : start_hour + 12]
    ranks = get_ranks_avg(window_uh)
    
    # Calculate critical arrangement of excess increments for each bell
    bell_excess_blocks = []
    for idx, b_depth in enumerate(bells):
        hourly = (norm_incr / 100.0) * b_depth
        if storm_duration_hr == 72:
            # Replicate Excel typo: convolve the depths directly (no loss rate subtracted)
            sorted_depths = sorted(hourly, reverse=True)
            aligned = []
            for r in ranks:
                k = int(np.floor(r))
                aligned.append(sorted_depths[k-1])
            bell_excess_blocks.append(np.array(list(reversed(aligned))))
        else:
            excess = np.maximum(0.0, hourly - loss_rate)
            sorted_excess = sorted(excess, reverse=True)
            aligned = []
            for r in ranks:
                k = int(np.floor(r))
                aligned.append(sorted_excess[k-1])
            bell_excess_blocks.append(np.array(list(reversed(aligned))))
        
    # Block permutations optimization
    num_blocks = len(bell_excess_blocks)
    import itertools
    best_peak = -1
    best_order = None
    best_drh = None
    
    if storm_duration_hr == 24:
        # Static order B1, B2
        p_list = [(0, 1)]
    else:
        # Permute all blocks (0 to num_blocks-1)
        p_list = list(itertools.permutations(range(num_blocks)))
        
    for p in p_list:
        # Combine the blocks in the permuted order
        combined_excess = np.concatenate([bell_excess_blocks[idx] for idx in p])
        
        # Convolve with UH
        drh = np.convolve(combined_excess, uh_ordinates)
        peak = np.max(drh)
        
        if peak > best_peak:
            best_peak = peak
            best_order = p
            best_drh = drh
            
    # Add base flow
    pmf_peak = best_peak + base_flow_total
    
    # Translate best order to 1-based block IDs (e.g. B1, B2)
    order_str = ", ".join([f"B{idx+1}" for idx in best_order])
    print(f"--- Duration {storm_duration_hr} hr ---")
    print("Best Order:", order_str)
    print("DRH Peak:", best_peak)
    print("PMF Peak:", pmf_peak)

def main():
    solve_pmf(24)
    solve_pmf(48)
    solve_pmf(72)

if __name__ == "__main__":
    main()
