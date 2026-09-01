from .._state import apply_state


class Transformer:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __getstate__(self):
        return self.__dict__

    def __setstate__(self, state):
        apply_state(self, state)