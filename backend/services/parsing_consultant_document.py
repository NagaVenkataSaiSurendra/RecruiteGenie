import re
from typing import List, Dict
import sys


def extract_profiles(text: str) -> List[Dict[str, str]]:
    """
    Extracts consultant profiles from the given text.
    Each profile should have: name, email, skills, education, years_of_experience.
    Handles multi-line skills extraction.
    Returns a list of dicts, one per profile.
    """
    print("\n--- DEBUG: Raw extracted text ---\n", text, file=sys.stderr)
    blocks = re.split(r'(?=Profle \d+:)', text, flags=re.IGNORECASE)
    print(f"\n--- DEBUG: Found {len(blocks)} profile blocks ---", file=sys.stderr)
    profiles = []
    for i, block in enumerate(blocks):
        if not block.strip():
            continue
        print(f"\n--- DEBUG: Block {i+1} ---\n{block}\n", file=sys.stderr)
        profile = {}
        profile['name'] = _extract_field(r'Name:\s*(.*)', block)
        profile['years_of_experience'] = _extract_field(r'Years of Experience:\s*(.*)', block)
        # Multi-line skills extraction
        profile['skills'] = _extract_multiline_field('Skills', block, ['Education', 'Email', 'Years of Experience', 'Name'])
        profile['education'] = _extract_field(r'Education:\s*(.*)', block)
        profile['email'] = _extract_field(r'Email:\s*(.*)', block)
        print(f"--- DEBUG: Parsed profile {i+1} ---\n{profile}\n", file=sys.stderr)
        profiles.append(profile)
    return profiles

def _extract_field(pattern: str, text: str) -> str:
    match = re.search(pattern, text)
    return match.group(1).strip() if match else None

def _extract_multiline_field(start_keyword: str, block: str, stop_keywords: list) -> str:
    # Find the start of the field
    start = re.search(rf'{start_keyword}[:\s]*\n?', block)
    if not start:
        return None
    start_idx = start.end()
    # Find the next stop keyword
    stop_idx = len(block)
    for kw in stop_keywords:
        m = re.search(rf'{kw}[:\s]*', block[start_idx:])
        if m:
            stop_idx = start_idx + m.start()
            break
    return block[start_idx:stop_idx].strip().replace('\n', ', ') 