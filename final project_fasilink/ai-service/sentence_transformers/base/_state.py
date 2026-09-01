def apply_state(instance, state):
    if isinstance(state, dict):
        instance.__dict__.update(state)
        return

    if isinstance(state, (list, tuple)):
        try:
            instance.__dict__.update(dict(state))
            return
        except Exception:
            pass

    instance.__dict__['state'] = state