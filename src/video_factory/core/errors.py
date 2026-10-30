"""Excepciones del dominio. Cada etapa lanza la suya para que el pipeline informe dónde falló."""


class VideoFactoryError(Exception):
    """Error base de la aplicación."""


class ConfigurationError(VideoFactoryError):
    """Falta una dependencia, credencial o configuración."""


class ContentGenerationError(VideoFactoryError):
    """La IA no produjo contenido válido dentro del límite de reintentos."""


class BudgetExceededError(VideoFactoryError):
    """Se alcanzó el presupuesto diario configurado para la API."""


class ValidationError(VideoFactoryError):
    """Un artefacto no cumple las reglas de calidad."""


class AudioError(VideoFactoryError):
    """Fallo al sintetizar o mezclar audio."""


class RenderError(VideoFactoryError):
    """Fallo al renderizar escenas o componer el video."""
