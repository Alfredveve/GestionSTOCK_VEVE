from rest_framework.pagination import PageNumberPagination


class CustomPageNumberPagination(PageNumberPagination):
    """
    Custom pagination class that allows dynamic page sizes via query parameter.
    Uses PAGE_SIZE_QUERY_PARAM from DRF settings.
    """
    page_size = 10  # Default page size
    page_size_query_param = 'page_size'  # Allow client to override page size
    max_page_size = 1000  # Maximum page size to prevent abuse
