"""
apps/reports/serializers.py
----------------------------
Response serializers for each reporting endpoint.

All serializers are read-only (no create/update logic needed) and map
directly to the column names returned by the SQL queries in queries.py.
"""

from rest_framework import serializers


class LeagueTableRowSerializer(serializers.Serializer):
    """
    One row of the league table: per-retailer performance summary.
    """

    retailer_name    = serializers.CharField()
    basco_score      = serializers.FloatField()
    fmv_at_risk      = serializers.FloatField()
    helpdesk_queries = serializers.IntegerField()


class MarketMaturityRowSerializer(serializers.Serializer):
    """
    One row of market maturity data: country, region, total_jobs, avg_basco_score, total_violations, fmv, attr_loss.
    """

    country          = serializers.CharField()
    region           = serializers.CharField()
    total_jobs       = serializers.IntegerField()
    avg_basco_score  = serializers.FloatField()
    total_violations = serializers.IntegerField()
    fmv              = serializers.FloatField(required=False, default=0.0)
    attr_loss        = serializers.FloatField(required=False, default=0.0)



class VisualAdoptionRowSerializer(serializers.Serializer):
    """
    One row of visual adoption data: per-retailer PMS visual usage breakdown.
    """

    retailer_name = serializers.CharField()
    visual_type   = serializers.CharField()
    usage_count   = serializers.IntegerField()


class CtaMixRowSerializer(serializers.Serializer):
    """
    One row of CTA mix data: campaign type and CTA breakdown.
    """

    campaign_type = serializers.CharField()
    cta_type      = serializers.CharField()
    count         = serializers.IntegerField()
