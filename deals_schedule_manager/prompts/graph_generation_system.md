# GRAPH GENERATION SYSTEM FOR DEAL & INSTAGRAM ANALYTICS

## 1. CORE GRAPH ARCHITECTURE

### Graph Type Selection Algorithm:

```python
def determine_graph_type(user_intent, data_metrics):
    """
    Determine optimal visualization type based on user query and available metrics
    
    Returns graph configuration object with specifications
    """
    
    # Pattern matching for chart types
    if "growth" in user_intent.lower() or "follower increase" in str(user_intent).lower():
        return {
            "primary_chart": "cumulative_area_line",
            "secondary_charts": ["absolute_bar_chart"],
            "x_axis_type": "temporal_dates",
            "y_axis_types": [
                {"name": "Absolute Followers", "type": "count"},
                {"name": "Growth Rate", "type": "percentage"}
            ]
        }
    
    elif "conversion" in str(user_intent).lower() or "funnel" in user_intent.lower():
        return {
            "primary_chart": "multi_stage_funnel",
            "chart_style": "area_filled_under_curve",
            "stages": [
                {"name": "Profile Visitors", "metric": "reach_impressions"},
                {"name": "Story Views", "metric": "views_count"},
                {"name": "Link Clicks", "metric": "clicks_count"},
                {"name": "DM Sent", "metric": "message_count"}
            ]
        }
    
    elif "engagement" in str(user_intent).lower():
        return {
            "primary_chart": "multi_line_comparison",
            "y_axis_type": "dual_scale_optional",
            "line_series": [
                {"name": "Engagement Rate (%)", "color": "#10b981"},
                {"name": "Likes Average", "color": "#64748b"},
                {"name": "Comments Average", "color": "#f59e0b"}
            ]
        }
    
    elif "reach" in str(user_intent).lower():
        return {
            "primary_chart": "dual_axis_bar_comparison",
            "y_axes": [
                {"primary": "reach_value", "scale": "linear"},
                {"secondary": "impressions", "scale": "logarithmic"}
            ]
        }
```

### Graph Output Format Specification:

```json
{
  "graph_metadata": {
    "chart_id": "auto_generated_unique_identifier",
    "creation_timestamp": "2026-10-24T00:00:00Z",
    "generated_by": "codex_analytics_engine_v2.0",
    "data_source_version": "instagram_api_metrics_current"
  },
  "visualization_config": {
    "primary_chart_type": "line_with_areas",
    "title": "Insight Title with Descriptive Label",
    "subtitle": "Optional subtitle providing context",
    "x_axis_configuration": {
      "type": "temporal_dates",
      "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
      "date_range": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"},
      "granularity": "weekly_snapshots"
    },
    "y_axis_configuration": {
      "type": "metric_value",
      "labels": ["0%", "25%", "50%", "75%", "100%"],
      "scale_type": "linear",
      "unit_label": "% / units"
    },
    "data_series": [
      {
        "name": "[Series Name]",
        "values": [value1, value2, ...],
        "trend_direction": "upward/downward/stable",
        "confidence_interval_95": [lower_bound, upper_bound]
      }
    ],
    "annotations": {
      "milestone_markers": [
        {"date": "YYYY-MM-DD", "label": "Milestone description", "value": numeric_value}
      ],
      "trend_indicators": [
        {"location": "data_point_range", "type": "arrow_up/arrow_down/arrows_vertical", "style": "solid/dashed"}
      ]
    }
  },
  "trend_analysis_included": {
    "primary_trend_detected": "upward/downward/stable/seasonal_pattern",
    "growth_rate_annual": "X.Y% (if upward)",
    "momentum_score": [0-1 scale],
    "seasonal_correlation": {
      "detected": true/false,
      "correlation_coefficient": 0.XX,
      "seasonal_pattern_description": "description"
    }
  },
  "performance_benchmarks": {
    "current_vs_baseline": {
      "baseline_metric_value": X,
      "current_metric_value": Y,
      "deviation_percentage": Z,
      "assessment": "above/below/at baseline"
    },
    "industry_comparison_note": [
      "Industry average metric: Avg",
      "Top performer in niche: High",
      "Your position vs industry percentile: XXth%"
    ],
    "improvement_opportunity_areas": [
      {"metric": "metric_name", "current_vs_optimal": current_value_minus_optimal, "recommendation": "suggested improvement action"}
    ]
  }
}
```

---

## 2. TIME RANGE OPTIONS IMPLEMENTATION

### Default Monthly Comparison (Time Range: Type)

```python
def generate_monthly_comparison_graph(metrics_data, comparison_type):
    """
    Generate comparative graph comparing current month vs previous period
    
    Parameters:
    - metrics_data: Dict containing historical performance data
    - comparison_type: string identifying which periods to compare
    
    Returns:
    - Graph configuration object with dual-period comparison visualization
    """
    
    if comparison_type == "current_vs_last_month":
        return {
            "graph_structure": {
                "chart_type": "dual_bar_comparison",
                "x_axis_label": "Time Period (Months)",
                "y_axis_label": "[Primary Metric Unit]",
                "comparison_groups": [
                    {
                        "group_name": f"{current_month} 2026",
                        "data_values": [get_metric_for_period(metrics_data, current_month) for metric in primary_metrics_list]
                    },
                    {
                        "group_name": f"Previous Month (Previous YYYY)",
                        "data_values": [get_metric_for_period(metrics_data, previous_month) for metric in primary_metrics_list]
                    }
                ]
            },
            "insights_generated": {
                "key_difference_detected": calculate_key_difference(current_metrics, prev_metrics),
                "statistically_significant_change": calculate_statistical_significance(),
                "recommendation_based_on_variance": recommend_optimization_strategy_if_needed()
            }
        }
```

### Custom Date Range Support

```python
def generate_custom_period_graph(start_date, end_date, user_defined_metrics):
    """
    Generate visualization for custom specified date range
    
    Parameters:
    - start_date: YYYY-MM-DD format string
    - end_date: YYYY-MM-DD format string  
    - user_defined_metrics: List of metrics to display in graph
    
    Returns:
    - Graph object with precise time-range visualization
    """
    
    # Parse and validate date range
    start = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.datetime.strptime(end_date, "%Y-%m-%d")
    
    return {
        "time_range_configuration": {
            "start_date": start,
            "end_date": end,
            "duration_days": (end - start).days + 1,
            "data_points_collected": generate_weekly_snapshots(start, end)
        },
        "chart_type_selection": {
            "user_specified_chart": user_defined_metrics["requested_graph_type"],
            "recommended_supplementary_charts": [
                "trend_line_overlay",
                "comparison_vs_year_ago_same_period",
                "moving_average_7_day"
            ]
        },
        "data_series_configuration": {
            "series_for_each_metric": generate_data_series(
                start, end, user_defined_metrics["primary_values"]
            )
        }
    }
```

### Quarterly Default Analysis

```python
def generate_quarterly_trend_analysis(metrics_data):
    """
    Generate quarterly trend visualization with seasonal pattern analysis
    
    Returns comprehensive Q1-Q4 comparison with seasonal indicators
    """
    
    quarter_breakdown = {
        "Q1": get_quarter_metrics(metrics_data, "quarter_1"),
        "Q2": get_quarter_metrics(metrics_data, "quarter_2"),
        "Q3": get_quarter_metrics(metrics_data, "quarter_3"),
        "Q4": get_quarter_metrics(metrics_data, "quarter_4")
    }
    
    return {
        "graph_configuration": {
            "chart_type": "line_with_year_over_year",
            "y_axis_types": [
                {"primary": "current_period_value"},
                {"secondary": "year_ago_same_period"}
            ],
            "x_axis_labels": ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"]
        },
        "seasonal_pattern_analysis": {
            "detected_seasonality": analyze_seasonality_patterns(quarter_breakdown),
            "trend_direction_overquarters": determine_overall_trend(quarter_breakdown),
            "anomaly_detection": identify_outlier_periods(quarter_breakdown)
        }
    }
```

---

## 3. GRAPH GENERATION WORKFLOW

### Full Generation Pipeline:

```python
def complete_graph_generation_pipeline(user_request, available_data):
    """
    Execute full graph generation workflow
    
    Input Parameters:
    - user_request: User's natural language request for visualization
    - available_data: Current data availability and metrics
    
    Output:
    - Complete graph object ready for rendering
    """
    
    # Step 1: Analyze user intent and desired visualization type
    intent_analysis = parse_user_intent(user_request)
    
    # Step 2: Determine appropriate time range
    time_range_config = select_time_range(intent_analysis, available_data.historical_data)
    
    # Step 3: Select graph type based on data availability and user preference
    chart_type = match_graph_to_data_type(
        intent_analysis, 
        time_range_config, 
        available_data.metrics_available
    )
    
    # Step 4: Generate visualization object
    graph_object = generate_visualization_chart(chart_type, time_range_config, available_data)
    
    # Step 5: Analyze trends from generated data
    trend_insights = analyze_trends_in_data(graph_object['data_points'])
    
    # Step 6: Generate recommendations based on insights
    improvement_suggestions = recommend_optimization_actions(trend_insights, available_data.current_metrics)
    
    return {
        "graph_metadata": graph_object['metadata'],
        "visualization_configuration": graph_object['visualization_config'],
        "trend_analysis_summary": trend_insights['summary'],
        "performance_benchmarks": trend_insights['benchmarks'],
        "improvement_recommendations": improvement_suggestions
    }
```

### User Request to Graph Mapping Table:

| USER QUERIES | MAP TO GRAPH TYPE | TIME RANGE | METRICS DISPLAYED |
|--------------|-------------------|-------------|-------------------|
| "Show my follower growth" | Cumulative Area Line Chart | Auto-Select (30-day or 90-day) | Followers count, Growth rate % |
| "My engagement over time" | Line Graph with Areas | Default Monthly OR Custom Range | Engagement %, Likes, Comments, Shares |
| "Compare current month to last" | Dual Bar Comparison | Monthly (default) OR Quarter comparison | All primary metrics + secondary conversion rates |
| "Conversion funnel analysis" | Funnel Chart | Same period or custom range | Profile → Stories → Links → DMs stats |
| "Best performing posts this month" | Multi-bar horizontal | Current month only | Per-post performance metrics |
| "Weekly trend analysis" | Line graph with moving average | Weekly (auto) | Trend direction, weekly averages |

---

## 4. TREND ANALYSIS COMPONENTS

### Trend Detection Algorithm:

```python
def trend_detection_algorithm(data_points):
    """
    Analyze data points and detect underlying trends
    
    Returns comprehensive trend analysis including anomalies
    """
    
    # Sort data chronologically
    sorted_data = sorted(data_points, key=lambda x: x['timestamp'])
    
    # Calculate overall trend direction
    first_value = sorted_data[0]['value']
    last_value = sorted_data[-1]['value']
    
    if last_value > first_value:
        trend_direction = "upward"
        growth_rate = ((last_value - first_value) / first_value) * 100
    elif last_value < first_value:
        trend_direction = "downward"  
        decline_rate = ((first_value - last_value) / first_value) * 100
    else:
        trend_direction = "stable"
    
    # Detect seasonal patterns (if sufficient data points)
    if len(sorted_data) >= 4 and trend_direction == "upward":
        seasonal_indicator = detect_seasonality(sorted_data)
    else:
        seasonal_indicator = None
    
    return {
        "detected_trend": trend_direction,
        "growth_rate_percentage": growth_rate if trend_direction != "stable" else 0,
        "seasonal_pattern_detected": bool(seasonal_indicator),
        "anomaly_points": identify_anomalies(sorted_data)
    }
```

### Anomaly Detection Logic:

```python
def identify_anomalies(data_points):
    """
    Identify statistical anomalies in data series
    
    Uses 3-sigma rule for anomaly detection
    """
    
    mean_value = np.mean([d['value'] for d in data_points])
    std_deviation = np.std([d['value'] for d in data_points])
    
    anomalies = []
    
    for point in data_points:
        deviation = (point['value'] - mean_value) / std_deviation
        
        if abs(deviation) > 2.5:  # Beyond 3-sigma threshold
            anomalies.append({
                "timestamp": point['timestamp'],
                "actual_value": point['value'],
                "expected_range": f"Mean ± 2σ: [{mean_value - (2 * std_deviation)}, {mean_value + (2 * std_deviation)}]",
                "deviation_magnitude": abs(deviation),
                "classification": "anomaly_detected" if deviation < -2.5 else "positive_outlier"
            })
    
    return anomalies
```

---

## 5. OUTPUT VISUALIZATION EXAMPLES

### Example 1: Engagement Rate Growth Graph

```python
# User input: "Show my engagement rate growth from January to March 2026"

output_graph = {
    "chart_type": "line_with_areas",
    "title": "Instagram Engagement Rate - Jan/Mar 2026 Trend Analysis",
    "visualization_config": {
        "x_axis": ["Jan 1, Mar 31"],
        "y_axis": [5.0, 7.0, 9.0],  # percentage scale
        "primary_series": {"name": "Engagement Rate (%)", "data": [6.2, 6.8, 7.4]},
        "secondary_series": {"name": "Avg Comments per Post", "data": [15, 18, 22]}
    },
    "trend_analysis": {
        "primary_trend": "upward",
        "growth_rate_annual": "+19.4% (7.4% - 6.2%)",
        "momentum_score": 0.85,
        "seasonal_pattern_detected": False,
        "anomalies_detected": []
    },
    "improvement_recommendations": [
        {
            "area": "content_consistency",
            "current_state": "6 posts/month avg",
            "suggested_action": "Increase to 8-10 posts per month with daily stories"
        },
        {
            "area": "hook_optimization",
            "current_state": "3-second completion rate: 68%",
            "suggested_action": "Refine first-frame text overlays for higher retention"
        }
    ]
}

print(output_graph)  # Generates rendered graph visualization
```

### Example 2: Conversion Funnel Graph

```python
# User input: "Analyze my conversion funnel - show growth rate and DM conversion optimization"

output_graph = {
    "chart_type": "multi_stage_funnel",
    "title": "Instagram Conversion Funnel Analysis - Oct 2026",
    "visualization_config": {
        "funnel_stages": [
            {"label": "Profile Visitors", "value": 1500, "percentage": "100%"},
            {"label": "Story Viewers", "value": 975, "percentage": "65%"},
            {"label": "Link Clicks", "value": 390, "percentage": "26%"},
            {"label": "DM Sent", "value": 141, "percentage": "9.4%"}
        ],
        "trend_line_overlay": [
            {"timestamp": "Sep_2026", "stage_values": [1450, 933, 385, 137]},
            {"timestamp": "Oct_2026", "stage_values": [1500, 975, 390, 141]}
        ]
    },
    "performance_insights": {
        "top_stage_optimization": {
            "stage": "Profile Visitors → Story Viewers (65% conversion)",
            "issue_detected": "Below optimal 75% threshold",
            "recommended_action": "Add compelling story content with clear CTA on profile picture"
        },
        "highest_conversion_stage": {
            "stage": "Link Clicks → DM Sent (36.2% conversion)",
            "note": "Strongest conversion point - maintain this strategy"
        }
    }
}
```

---

## 6. IMPLEMENTATION INTEGRATION CHECKLIST

### Before deploying this graph generation system:

- [ ] Configure primary metrics and thresholds for your specific business context
- [ ] Set up historical data collection with proper timestamp indexing  
- [ ] Test anomaly detection algorithms with known data patterns
- [ ] Validate chart rendering compatibility across different visualization platforms
- [ ] Establish baseline comparison periods for trend calculations
- [ ] Create user interface for graph customization and export options

This comprehensive graph generation system ensures you have powerful data visualizations that directly connect Instagram performance to your deal pipeline optimization strategy. 🎯
