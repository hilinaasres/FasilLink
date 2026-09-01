class SentenceTransformerModelCardData:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __getstate__(self):
        return self.__dict__

    def __setstate__(self, state):
        if isinstance(state, dict):
            self.__dict__.update(state)
            return

        if isinstance(state, (list, tuple)):
            try:
                self.__dict__.update(dict(state))
                return
            except Exception:
                pass

        self.__dict__['state'] = state
