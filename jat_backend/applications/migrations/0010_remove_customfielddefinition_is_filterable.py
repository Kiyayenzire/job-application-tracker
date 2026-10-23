from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("applications", "0009_alter_application_country_alter_company_country"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customfielddefinition",
            name="is_filterable",
        ),
    ]
