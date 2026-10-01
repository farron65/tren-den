from fastapi import HTTPException

from auth_utils import verify_bot_key

import pytest

from config import BOT_API_KEY

def test_verify_bot_key_valid():
    assert verify_bot_key(BOT_API_KEY) is None
    
def test_verify_bot_key_invalid():
    with pytest.raises(HTTPException) as exc:
        verify_bot_key("wrong")
    assert exc.value.status_code == 401
    
def test_verify_bot_key_non_ascii():
    with pytest.raises(HTTPException) as exc:
        verify_bot_key("Héllo")
    assert exc.value.status_code == 401