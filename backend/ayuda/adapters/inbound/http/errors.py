from django.db import IntegrityError, OperationalError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_handler
from ayuda.domain.rules import Conflict, DomainError, NotFound


def exception_handler(error, context):
    if isinstance(error, DomainError):
        code = (
            404
            if isinstance(error, NotFound)
            else 409
            if isinstance(error, Conflict)
            else 400
        )
        return Response({"message": error.message, "fields": error.fields}, status=code)
    if isinstance(error, IntegrityError):
        return Response(
            {
                "message": "El registro duplica una necesidad existente o incumple una relación. Revisa los datos.",
                "fields": {},
            },
            status=409,
        )
    if isinstance(error, OperationalError):
        return Response(
            {
                "message": "La base de datos está ocupada temporalmente. Vuelve a intentarlo.",
                "fields": {},
            },
            status=503,
        )
    response = drf_handler(error, context)
    if response is not None:
        data = response.data
        response.data = {
            "message": str(data.get("detail", "Revisa los campos del formulario."))
            if isinstance(data, dict)
            else "No se pudo procesar la solicitud.",
            "fields": data if isinstance(data, dict) and "detail" not in data else {},
        }
    return response
