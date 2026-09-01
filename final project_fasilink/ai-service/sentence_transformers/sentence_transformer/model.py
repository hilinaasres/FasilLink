from ..base import SentenceTransformerBase
from ..base._state import apply_state


class SentenceTransformer(SentenceTransformerBase):
    def __setstate__(self, state):
        apply_state(self, state)
