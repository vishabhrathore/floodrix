import numpy as np

def get_ranks_avg(arr):
    # RANK.AVG in python
    # We sort descending, find ranks, and average ties
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

def main():
    # Window UH from Excel
    window_uh = np.array([102.5, 153.75, 179.375, 205, 187.91666666666669, 170.83333333333334, 
                          153.75, 136.66666666666669, 119.58333333333334, 102.5, 96.80555555555557, 
                          91.11111111111113])
                          
    ranks = get_ranks_avg(window_uh)
    print("Ranks:", ranks)
    
    # Bell 1 Increments
    bell1_depth = 33.9476
    cum = np.array([15.1, 25.5, 31.6, 36.9, 42.2, 47.1, 51.8, 56.4, 60.8, 65.2, 69.3, 73.0])
    incr = np.zeros_like(cum)
    incr[0] = cum[0]
    for i in range(1, len(cum)):
        incr[i] = cum[i] - cum[i-1]
    norm_incr = incr * (100.0 / np.sum(incr))
    
    hourly = (norm_incr / 100.0) * bell1_depth
    excess = np.maximum(0, hourly - 0.23)
    sorted_excess = sorted(excess, reverse=True)
    
    aligned = []
    for r in ranks:
        k = int(np.floor(r))
        aligned.append(sorted_excess[k-1])
        
    critical_arrangement = list(reversed(aligned))
    print("Critical Arrangement:", [round(x, 4) for x in critical_arrangement])

if __name__ == "__main__":
    main()
