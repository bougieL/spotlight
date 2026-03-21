#[cfg(windows)]
pub unsafe fn query_registry_string(
    hkey: windows::Win32::System::Registry::HKEY,
    value_name: windows::core::PCWSTR,
) -> Option<String> {
    use windows::Win32::System::Registry::{RegQueryValueExW, REG_SZ, REG_VALUE_TYPE};

    let mut data_buf: [u16; 512] = [0; 512];
    let mut data_len: u32 = (data_buf.len() * std::mem::size_of::<u16>()) as u32;
    let mut value_type: REG_VALUE_TYPE = REG_VALUE_TYPE(0);

    let result = RegQueryValueExW(
        hkey,
        value_name,
        None,
        Some(&mut value_type),
        Some(data_buf.as_mut_ptr() as *mut u8),
        Some(&mut data_len),
    );

    if result.is_ok() && value_type == REG_SZ {
        let char_count = (data_len / 2) as usize;
        let s = String::from_utf16_lossy(&data_buf[..char_count.saturating_sub(1)]);
        if s.is_empty() {
            None
        } else {
            Some(s)
        }
    } else {
        None
    }
}
