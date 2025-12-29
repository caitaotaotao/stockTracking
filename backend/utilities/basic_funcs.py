def stock_market(code: str):
    if code[0] == "6":
        return code + ".SH"
    elif code[0] == "0":
        return code + ".SZ"
    elif code[0] == "3":
        return code + ".SZ"
    elif code[0] == "8":
        return code + ".BJ"
    else:
        return code