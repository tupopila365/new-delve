from django.contrib import admin

from .models import Journey, JourneyAnswer, JourneyCostLine, JourneyEntry, JourneyQuestion, JourneyStop

admin.site.register(Journey)
admin.site.register(JourneyStop)
admin.site.register(JourneyEntry)
admin.site.register(JourneyCostLine)
admin.site.register(JourneyQuestion)
admin.site.register(JourneyAnswer)
