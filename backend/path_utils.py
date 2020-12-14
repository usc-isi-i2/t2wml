import sys


def windows_add_to_path(dir):
    if sys.platform != 'win32':
        raise ValueError("Can't set path on anything other than Windows")
    import winreg

    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment', access=winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE) as key:
        try:
            path, type = winreg.QueryValueEx(key, 'Path')
        except WindowsError:
            path = ''
            type = winreg.REG_EXPAND_SZ

        if dir in path:
            return   # Value already in path
        
        if not path:
            path = dir
        else:
            path += ';' + dir

        winreg.SetValueEx(key, 'Path', 0, type, path)
