pub fn generate_color_from_string(s: &str) -> (u8, u8, u8) {
    let colors: [(u8, u8, u8); 8] = [
        (66, 133, 244), // Blue
        (234, 67, 53),  // Red
        (251, 188, 5),  // Yellow
        (52, 168, 83),  // Green
        (255, 112, 67), // Orange
        (156, 39, 176), // Purple
        (0, 188, 212),  // Cyan
        (255, 87, 34),  // Deep Orange
    ];

    let hash: u32 = s
        .bytes()
        .fold(0u32, |acc, b| acc.wrapping_add(b as u32).wrapping_mul(31));

    colors[(hash % 8 as u32) as usize]
}
