from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0007_company_application_company_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="application",
            name="english_level",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A1", "A1"),
                    ("A2", "A2"),
                    ("B1", "B1"),
                    ("B2", "B2"),
                    ("C1", "C1"),
                    ("C2", "C2"),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="application",
            name="german_level",
            field=models.CharField(
                blank=True,
                choices=[
                    ("A1", "A1"),
                    ("A2", "A2"),
                    ("B1", "B1"),
                    ("B2", "B2"),
                    ("C1", "C1"),
                    ("C2", "C2"),
                ],
                max_length=20,
            ),
        ),
    ]
