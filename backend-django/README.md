Django REST backend for Farm Health Advisory System

Setup:

python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

API endpoints:

- POST /api/auth/signup/ -> register
- POST /api/auth/login/ -> obtain JWT (use refresh endpoint for refresh)
- GET/POST /api/reports/ -> list/create reports
- GET /api/reports/<id>/ -> report detail
- GET /api/analytics/overview/ -> basic analytics

Media uploads are stored in backend-django/media/
