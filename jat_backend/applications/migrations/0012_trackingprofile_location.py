from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0011_scoped_custom_fields_and_company_custom_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="trackingprofile",
            name="location",
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
