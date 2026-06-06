from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Report


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'email', 'first_name', 'last_name')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ReportSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('predicted_disease', 'severity', 'advisory', 'status', 'created_at')
