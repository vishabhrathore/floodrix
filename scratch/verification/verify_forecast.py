import numpy as np

def forecast_linear(x, known_y, known_x):
    # Perform linear regression to find y = mx + c
    x_mean = np.mean(known_x)
    y_mean = np.mean(known_y)
    
    num = np.sum((known_x - x_mean) * (known_y - y_mean))
    den = np.sum((known_x - x_mean) ** 2)
    
    m = num / den
    c = y_mean - m * x_mean
    
    return m * x + c

def main():
    x = 875.41
    
    # 24hr SPS
    known_x_24 = np.array([500, 1000, 1500, 2000, 3000, 4000, 5000])
    known_y_24 = np.array([0.94, 0.91, 0.90, 0.88, 0.86, 0.83, 0.81])
    val_24 = forecast_linear(x, known_y_24, known_x_24)
    print("Forecast 24hr:", val_24)
    
    # 48hr SPS
    known_x_48 = np.array([500, 1000, 1500, 2000, 3000, 4000, 5000])
    known_y_48 = np.array([0.95, 0.92, 0.91, 0.89, 0.87, 0.85, 0.83])
    val_48 = forecast_linear(x, known_y_48, known_x_48)
    print("Forecast 48hr:", val_48)
    
    # 72hr SPS
    known_x_72 = np.array([500, 1000, 1500, 2000, 3000, 4000, 5000])
    known_y_72 = np.array([0.96, 0.94, 0.93, 0.92, 0.90, 0.88, 0.86])
    val_72 = forecast_linear(x, known_y_72, known_x_72)
    print("Forecast 72hr:", val_72)

if __name__ == "__main__":
    main()
