import sys
import types
import importlib.abc
import importlib.machinery

from sentence_transformers.base._state import apply_state


class WeightRenaming:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def __getstate__(self):
        return self.__dict__

    def __setstate__(self, state):
        apply_state(self, state)


module_name = 'transformers.core_model_loading'
if module_name not in sys.modules:
    module = types.ModuleType(module_name)
    module.WeightRenaming = WeightRenaming
    sys.modules[module_name] = module

    try:
        import transformers
        transformers.core_model_loading = module
    except Exception:
        pass


def _dummy_class(class_name):
    class Dummy:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

        def __getstate__(self):
            return self.__dict__

        def __setstate__(self, state):
            apply_state(self, state)

        def __repr__(self):
            return f'<{class_name} shim>'

    Dummy.__name__ = class_name
    Dummy.__qualname__ = class_name
    return Dummy


class _FallbackLoader(importlib.abc.Loader):
    def create_module(self, spec):
        return None

    def exec_module(self, module):
        def __getattr__(name):
            value = _dummy_class(name)
            setattr(module, name, value)
            return value

        module.__getattr__ = __getattr__


class _FallbackFinder(importlib.abc.MetaPathFinder):
    PREFIXES = ('sentence_transformers.', 'transformers.core_model_loading')

    def find_spec(self, fullname, path, target=None):
        if not any(fullname == prefix or fullname.startswith(prefix) for prefix in self.PREFIXES):
            return None

        search_path = path if isinstance(path, (list, tuple)) else None
        existing = importlib.machinery.PathFinder.find_spec(fullname, search_path)
        if existing is not None:
            return None

        return importlib.machinery.ModuleSpec(fullname, _FallbackLoader())


if not any(isinstance(finder, _FallbackFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _FallbackFinder())
