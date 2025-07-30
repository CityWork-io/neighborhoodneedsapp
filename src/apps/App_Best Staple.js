import React, { useState, useEffect, useMemo, useRef } from "react";
import './styles.css';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Home,
  DollarSign,
  Activity,
  Heart,
  GraduationCap,
  Stethoscope,
  Users,
  Brain,
  Zap,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wine,
  Cigarette,
  Wifi,
  Car,
  Briefcase,
  UserCheck,
  Eye,
  Smartphone,
  CreditCard,
  Clock,
  ChevronRight,
  Shield,
  MapPin,
} from "lucide-react";

// ArcGIS Map Component
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-zoom";

const ArcGISWebMap = ({ selectedTract, tractData }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const handleViewReady = async (event) => {
      console.log("Map view ready event fired");
      const { view } = event.target;
      
      if (!view) {
        console.log("No view available");
        return;
      }

      // Wait for the map to fully load
      await view.when();
      console.log("View loaded, checking layers");

      // Log all layers to see what's available
      view.map.layers.forEach(async (layer, index) => {
        console.log(`Layer ${index}:`, layer.title, layer.type);
        
        // If it's a feature layer, log its fields
        if (layer.type === "feature") {
          await layer.load();
          console.log(`Fields for ${layer.title}:`, layer.fields?.map(f => ({
            name: f.name,
            alias: f.alias,
            type: f.type
          })));
        }
      });

      setMapLoaded(true);
    };

    const mapElement = mapRef.current;
    if (mapElement) {
      mapElement.addEventListener("arcgisViewReadyChange", handleViewReady);
      
      return () => {
        if (mapElement) {
          mapElement.removeEventListener("arcgisViewReadyChange", handleViewReady);
        }
      };
    }
  }, []);

  // Separate effect for handling tract selection
  useEffect(() => {
    if (!mapLoaded || !selectedTract) return;

    const selectTract = async () => {
      const mapElement = mapRef.current;
      if (!mapElement || !mapElement.view) return;

      const view = mapElement.view;
      
      // Find the tract layer - might need to adjust the search criteria
      const tractLayer = view.map.layers.find(layer => 
        layer.title?.toLowerCase().includes("tract") || 
        layer.title?.toLowerCase().includes("census") ||
        layer.type === "feature" // If no name match, try the first feature layer
      );

      if (tractLayer) {
        console.log("Using layer:", tractLayer.title);
        
        try {
          await tractLayer.load();
          
          // Log available fields
          console.log("Available fields:", tractLayer.fields?.map(f => f.name));
          
          // Try to find the right field name
          const possibleFields = ['GEOID', 'GEOID10', 'GEOID20', 'FIPS', 'TRACTCE', 'NAME', 'GEOID_Data'];
          let fieldToUse = null;
          
          for (const fieldName of possibleFields) {
            if (tractLayer.fields?.some(f => f.name === fieldName)) {
              fieldToUse = fieldName;
              break;
            }
          }
          
          if (!fieldToUse) {
            console.error("Could not find a suitable field for querying");
            return;
          }
          
          console.log("Using field:", fieldToUse);
          
          const query = tractLayer.createQuery();
          query.where = `${fieldToUse} = '${selectedTract}'`;
          query.returnGeometry = true;
          query.outFields = ["*"];

          const results = await tractLayer.queryFeatures(query);
          console.log("Query results:", results.features.length);
          
          if (results.features.length > 0) {
            console.log("First feature attributes:", results.features[0].attributes);
            await view.goTo({
              target: results.features[0].geometry,
              zoom: 12
            });
          } else {
            console.log("No features found for value:", selectedTract);
          }
        } catch (error) {
          console.error("Query error:", error);
        }
      }
    };

    selectTract();
  }, [mapLoaded, selectedTract]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <MapPin className="mr-2 h-5 w-5" />
        Census Tract Map
      </h2>
      <arcgis-map
        ref={mapRef}
        item-id="b87c81d323a24f6486bfbbb8d323b378"
        portal-url="https://city-work.maps.arcgis.com"
        style={{ height: "400px", width: "100%" }}
      >
        <arcgis-zoom position="top-left"></arcgis-zoom>
      </arcgis-map>
      {selectedTract && (
        <p className="text-sm text-gray-600 mt-2">
          Showing tract: {selectedTract}
        </p>
      )}
    </div>
  );
};

const DynamicRankingSystem = () => {
  const [data, setData] = useState([]);
  const [weights, setWeights] = useState({});
  const [selectedTract, setSelectedTract] = useState(null);
  const [preset, setPreset] = useState("balanced");
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAllRankings, setShowAllRankings] = useState(false);

  // Comprehensive variable categories with ALL variables from dataset
  const categories = {
    "Chronic Health Conditions": {
      icon: Heart,
      color: "red",
      variables: {
        "Adults with Arthritis": { weight: 3, inverted: true },
        "Adults with High Blood Pressure": { weight: 4, inverted: true },
        "Adults with Hypertension": { weight: 4, inverted: true },
        "Adults with Cancer": { weight: 3, inverted: true },
        "Adults with Asthma": { weight: 3, inverted: true },
        "Adults with Heart Disease": { weight: 5, inverted: true },
        "Adults with COPD": { weight: 4, inverted: true },
        "Adults with Diabetes": { weight: 5, inverted: true },
        "Adults with High Cholesterol": { weight: 3, inverted: true },
        "Adults with Stroke History": { weight: 4, inverted: true },
      },
    },
    "Health Behaviors & Lifestyle": {
      icon: Wine,
      color: "purple",
      variables: {
        "Adults that Binge Drinking": { weight: 3, inverted: true },
        "Adults Who Are Current Smokers": { weight: 4, inverted: true },
        "Adults with Low Physical Activity": { weight: 3, inverted: true },
        "Adults with Obesity": { weight: 5, inverted: true },
        "Adults with Insufficient Sleep": { weight: 2, inverted: true },
        "Adults with Lost Teeth": { weight: 2, inverted: true },
      },
    },
    "Mental & Overall Health": {
      icon: Brain,
      color: "indigo",
      variables: {
        "Adults with Depression": { weight: 5, inverted: true },
        "Adults with Fair or Poor Health": { weight: 4, inverted: true },
        "Adults with Poor Mental Health": { weight: 4, inverted: true },
        "Adults with Poor Physical Health": { weight: 4, inverted: true },
      },
    },
    "Healthcare Access & Screening": {
      icon: Stethoscope,
      color: "blue",
      variables: {
        "Lack of Health Insurance": { weight: 6, inverted: true },
        "Adults with a Recent Checkup": { weight: 3, inverted: false },
        "Adults with a recent Cholesterol Screening": {
          weight: 2,
          inverted: false,
        },
        "Adults with Colon Cancer Screening": { weight: 2, inverted: false },
        "Adults with a Recent Dental Visit": { weight: 3, inverted: false },
        "Adults with Recent Mammogram": { weight: 2, inverted: false },
      },
    },
    "Disability Status": {
      icon: UserCheck,
      color: "amber",
      variables: {
        "Adults with Hearing Disability": { weight: 3, inverted: true },
        "Adults with Vision Disability": { weight: 3, inverted: true },
        "Adults with Cognitive Disability": { weight: 4, inverted: true },
        "Adults with Mobility Disability": { weight: 4, inverted: true },
        "Adults with Self-Care Disability": { weight: 4, inverted: true },
        "Adults with Independent Living Disability": {
          weight: 4,
          inverted: true,
        },
        "Adults with Any Disability": { weight: 4, inverted: true },
      },
    },
    "Senior/Elderly Population": {
      icon: Users,
      color: "gray",
      variables: {
        "Senior Renter households whose householder is 65 years and over (2023)":
          { weight: 3, inverted: true },
        "Owner households whose householder is 65 years and over (2023)": {
          weight: 2,
          inverted: false,
        },
        "Senior Population (60 years and over) for Whom Poverty Status is Determined (2023)":
          { weight: 3, inverted: true },
        "Percent of Population 65 Years and Over who Lives Alone": {
          weight: 4,
          inverted: true,
        },
        "Percent of Seniors (60 years and over) whose income in the past 12 months is below poverty level":
          { weight: 5, inverted: true },
      },
    },
    "Economic & Financial Status": {
      icon: DollarSign,
      color: "green",
      variables: {
        "Median Disposable Income": { weight: 4, inverted: false },
        "Median Household Income 2024": { weight: 5, inverted: false },
        "Number of Households on Food Stamps (2022)": {
          weight: 4,
          inverted: true,
        },
        "Median Net Worth": { weight: 4, inverted: false },
        "Percent of Households Living Below Poverty Line": {
          weight: 6,
          inverted: true,
        },
        "2024 Avg Value of Household Credit Card Debt": {
          weight: 3,
          inverted: true,
        },
        "2024 Average Value Owed Student Loans per Household": {
          weight: 3,
          inverted: true,
        },
        "Percent of Children Living Below Poverty Line": {
          weight: 7,
          inverted: true,
        },
      },
    },
    "Housing & Transportation": {
      icon: Home,
      color: "orange",
      variables: {
        "Overall Homeownership Rate: Percent of Occupied Housing Units that are Owner-Occupied":
          { weight: 3, inverted: false },
        "Overall Renter Rate: Percent of Occupied Housing Units that are Renter-Occupied":
          { weight: 2, inverted: true },
        "Percent of Households with No Vehicle": { weight: 5, inverted: true },
        "Percent of workers whose commute was 90 minutes or more": {
          weight: 3,
          inverted: true,
        },
      },
    },
    "Insurance Coverage": {
      icon: Shield,
      color: "teal",
      variables: {
        "Percent of Population w/ Medicaid (Means Tested Public Coverage": {
          weight: 3,
          inverted: true,
        },
        "Percent of Population w/ Medicare Coverage": {
          weight: 2,
          inverted: false,
        },
        "Percent of Population w/ No Health Insurance": {
          weight: 5,
          inverted: true,
        },
      },
    },
    "Digital Access & Technology": {
      icon: Wifi,
      color: "cyan",
      variables: {
        "Percent of Population w/ no Smart Phone": {
          weight: 4,
          inverted: true,
        },
        "Percent of Population without Internet Access": {
          weight: 5,
          inverted: true,
        },
      },
    },
    Employment: {
      icon: Briefcase,
      color: "slate",
      variables: {
        "Percent Not in Labor Force": { weight: 3, inverted: true },
        "Percent Unemployment (Looking for Work)": {
          weight: 5,
          inverted: true,
        },
      },
    },
    Education: {
      icon: GraduationCap,
      color: "violet",
      variables: {
        "Percent of Population 25 Years and Over whose Highest Education Completed is High School (includes equivalency)":
          { weight: 3, inverted: false },
        "Percent of Population 25 Years and Over whose Highest Education Completed is Bachelor's Degree or Higher":
          { weight: 5, inverted: false },
      },
    },
  };

  // Initialize weights and expanded state
  useEffect(() => {
    const initialWeights = {};
    Object.entries(categories).forEach(([category, catData]) => {
      Object.entries(catData.variables).forEach(([variable, config]) => {
        initialWeights[variable] = config.weight;
      });
    });
    setWeights(initialWeights);

    // Initialize expanded state - start with all collapsed
    const expanded = {};
    Object.keys(categories).forEach((cat) => {
      expanded[cat] = false;
    });
    setExpandedCategories(expanded);
  }, []);

  // Load and parse data with proper CSV handling
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch("/artifact_test_Sheet16.csv");
        const csvContent = await response.text();

        // Proper CSV parser that handles quotes
        const parseCSVRow = (row) => {
          const result = [];
          let current = "";
          let inQuotes = false;

          for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }

          // Don't forget the last value
          result.push(current.trim());

          return result;
        };

        const lines = csvContent.split(/\r?\n/);

        // Parse headers
        const headers = parseCSVRow(lines[0]);

        // Parse data rows
        const parsedData = lines
          .slice(1)
          .map((line, lineIndex) => {
            const values = parseCSVRow(line);
            const row = {};

            headers.forEach((header, i) => {
              let value = values[i]?.trim();

              // Remove quotes if present
              if (value && value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }

              // Clean up monetary values (remove $ and commas)
              if (value && (value.includes("$") || value.includes(","))) {
                value = value.replace(/[$,]/g, "");
              }

              // Parse as number if possible
              const numValue = parseFloat(value);
              row[header] = isNaN(numValue) ? value : numValue;
            });

            return row;
          })
          .filter((row) => row.GEOID); // Filter out empty rows

        console.log("Loaded", parsedData.length, "census tracts");
        setData(parsedData);

        if (parsedData.length > 0) {
          setSelectedTract(parsedData[0].GEOID);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Preset configurations
  const presets = {
    balanced: {
      name: "Balanced Approach",
      description: "Equal focus across all domains",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable, config]) => {
            w[variable] = 5;
          });
        });
        return w;
      },
    },
    health_crisis: {
      name: "Health Crisis Response",
      description: "Target areas with highest disease burden",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable, config]) => {
            if (
              [
                "Chronic Health Conditions",
                "Mental & Overall Health",
                "Healthcare Access & Screening",
              ].includes(category)
            ) {
              w[variable] = 10;
            } else if (category === "Health Behaviors & Lifestyle") {
              w[variable] = 8;
            } else {
              w[variable] = 2;
            }
          });
        });
        return w;
      },
    },
    substance_abuse: {
      name: "Substance Abuse Prevention",
      description: "Focus on addiction and mental health",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable]) => {
            if (
              variable.includes("Binge Drinking") ||
              variable.includes("Smokers")
            ) {
              w[variable] = 15;
            } else if (
              variable.includes("Depression") ||
              variable.includes("Mental Health")
            ) {
              w[variable] = 12;
            } else if (category === "Economic & Financial Status") {
              w[variable] = 6;
            } else {
              w[variable] = 2;
            }
          });
        });
        return w;
      },
    },
    child_poverty: {
      name: "Child & Family Focus",
      description: "Prioritize areas with high child poverty",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable]) => {
            if (variable.includes("Children")) {
              w[variable] = 15;
            } else if (
              [
                "Economic & Financial Status",
                "Education",
                "Digital Access & Technology",
              ].includes(category)
            ) {
              w[variable] = 8;
            } else {
              w[variable] = 3;
            }
          });
        });
        return w;
      },
    },
    senior_vulnerability: {
      name: "Senior Support",
      description: "Focus on elderly populations with needs",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable]) => {
            if (category === "Senior/Elderly Population") {
              w[variable] = 12;
            } else if (
              [
                "Chronic Health Conditions",
                "Disability Status",
                "Housing & Transportation",
              ].includes(category)
            ) {
              w[variable] = 8;
            } else {
              w[variable] = 2;
            }
          });
        });
        return w;
      },
    },
    digital_equity: {
      name: "Digital & Economic Access",
      description: "Target digital divide and economic barriers",
      weights: () => {
        const w = {};
        Object.entries(categories).forEach(([category, catData]) => {
          Object.entries(catData.variables).forEach(([variable]) => {
            if (category === "Digital Access & Technology") {
              w[variable] = 15;
            } else if (
              [
                "Economic & Financial Status",
                "Education",
                "Employment",
              ].includes(category)
            ) {
              w[variable] = 8;
            } else {
              w[variable] = 2;
            }
          });
        });
        return w;
      },
    },
  };

  // Calculate normalized scores and rankings
  const rankedData = useMemo(() => {
    if (!data.length || !Object.keys(weights).length) return [];

    // Get all variables we're tracking
    const allVariables = [];
    Object.entries(categories).forEach(([category, catData]) => {
      Object.keys(catData.variables).forEach((variable) => {
        allVariables.push({ variable, ...catData.variables[variable] });
      });
    });

    // Calculate min/max for normalization
    const ranges = {};
    allVariables.forEach(({ variable }) => {
      const values = data
        .map((d) => d[variable])
        .filter((v) => !isNaN(v) && v !== null);
      if (values.length > 0) {
        ranges[variable] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });

    // Score each tract
    const scored = data.map((tract) => {
      let totalScore = 0;
      let totalWeight = 0;
      const scores = {};

      allVariables.forEach(({ variable, inverted }) => {
        const value = tract[variable];
        const weight = weights[variable] || 0;

        if (!isNaN(value) && value !== null && weight > 0 && ranges[variable]) {
          const range = ranges[variable];
          let normalizedScore;

          if (range.max === range.min) {
            normalizedScore = 0.5;
          } else if (inverted) {
            normalizedScore = (range.max - value) / (range.max - range.min);
          } else {
            normalizedScore = (value - range.min) / (range.max - range.min);
          }

          scores[variable] = normalizedScore * 100;
          totalScore += normalizedScore * weight;
          totalWeight += weight;
        }
      });

      const compositeScore =
        totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

      return {
        ...tract,
        compositeScore,
        scores,
      };
    });

    // Sort by composite score (lowest first - highest need)
    return scored
      .sort((a, b) => a.compositeScore - b.compositeScore)
      .map((tract, index) => ({ ...tract, rank: index + 1 }));
  }, [data, weights]);

  const handleWeightChange = (variable, value) => {
    setWeights((prev) => ({ ...prev, [variable]: value }));
    setPreset("custom");
  };

  const applyPreset = (presetKey) => {
    setPreset(presetKey);
    setWeights(presets[presetKey].weights());
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const selectedTractData = rankedData.find((t) => t.GEOID === selectedTract);

  const getRankColor = (rank, total) => {
    const percentile = rank / total;
    if (percentile <= 0.2) return "text-red-600 bg-red-50";
    if (percentile <= 0.4) return "text-orange-600 bg-orange-50";
    if (percentile <= 0.6) return "text-yellow-600 bg-yellow-50";
    if (percentile <= 0.8) return "text-green-600 bg-green-50";
    return "text-blue-600 bg-blue-50";
  };

  const getScoreColor = (score) => {
    if (score <= 30) return "text-red-600";
    if (score <= 50) return "text-orange-600";
    if (score <= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  // Determine which rankings to show
  const displayedRankings = showAllRankings
    ? rankedData
    : rankedData.slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Dynamic Neighborhood Ranking System
        </h1>
        <p className="text-gray-600">
          Multi-factor analysis for targeted community interventions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Priority Weights
          </h2>

          {/* Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Policy Presets
            </label>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="custom">Custom Configuration</option>
              {Object.entries(presets).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
            {preset !== "custom" && (
              <p className="text-xs text-gray-500 mt-1">
                {presets[preset]?.description}
              </p>
            )}
          </div>

          {/* Category-based Weight Controls */}
          <div className="space-y-3">
            {Object.entries(categories).map(([category, catData]) => {
              const Icon = catData.icon;
              const isExpanded = expandedCategories[category];

              return (
                <div
                  key={category}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded p-1"
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`mr-2 h-5 w-5 text-${catData.color}-600`}
                      />
                      <span className="font-medium text-gray-800 text-sm">
                        {category}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({Object.keys(catData.variables).length})
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {Object.entries(catData.variables).map(
                        ([variable, config]) => (
                          <div key={variable}>
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className="text-xs text-gray-700 flex items-center"
                                title={variable}
                              >
                                {variable.length > 45
                                  ? variable.substring(0, 45) + "..."
                                  : variable}
                                {config.inverted && (
                                  <span
                                    className="ml-1 text-red-500"
                                    title="Lower values = higher priority"
                                  >
                                    ↓
                                  </span>
                                )}
                              </label>
                              <span className="text-xs text-gray-500">
                                {weights[variable] || 0}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="15"
                              value={weights[variable] || 0}
                              onChange={(e) =>
                                handleWeightChange(
                                  variable,
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Total Weight: <span className="font-semibold">{totalWeight}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Active Variables:{" "}
              {Object.values(weights).filter((w) => w > 0).length} of{" "}
              {Object.values(weights).length}
            </p>
          </div>
        </div>

        {/* Center Panel - Rankings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Neighborhood Rankings
            <span className="ml-2 text-sm text-gray-500">
              ({rankedData.length} tracts)
            </span>
          </h2>

          <div className="mb-3 text-xs text-gray-600">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            Lower scores = higher intervention priority
          </div>

          <div className="space-y-2 max-h-[65vh] overflow-y-auto">
            {displayedRankings.map((tract) => (
              <div
                key={tract.GEOID}
                onClick={() => setSelectedTract(tract.GEOID)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  selectedTract === tract.GEOID
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getRankColor(
                        tract.rank,
                        rankedData.length
                      )}`}
                    >
                      {tract.rank}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {tract.NAME || `Tract ${tract.GEOID}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {tract.County}, {tract.State}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${getScoreColor(
                        tract.compositeScore
                      )}`}
                    >
                      {tract.compositeScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gradient-to-r from-red-500 to-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${tract.compositeScore}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More/Less Button */}
          {rankedData.length > 10 && (
            <button
              onClick={() => setShowAllRankings(!showAllRankings)}
              className="mt-4 w-full flex items-center justify-center py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm text-gray-700"
            >
              {showAllRankings ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  Show Top 10 Only
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  Show All {rankedData.length} Tracts
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Panel - Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 max-h-[85vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Neighborhood Analysis
          </h2>

          {selectedTractData && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedTractData.NAME ||
                    `Census Tract ${selectedTractData.GEOID}`}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedTractData.County}, {selectedTractData.State}
                </p>

                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRankColor(
                    selectedTractData.rank,
                    rankedData.length
                  )}`}
                >
                  Rank #{selectedTractData.rank} of {rankedData.length}
                </div>

                <div className="mt-3">
                  <p
                    className={`text-3xl font-bold ${getScoreColor(
                      selectedTractData.compositeScore
                    )}`}
                  >
                    {selectedTractData.compositeScore.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">Composite Score</p>
                  <p className="text-xs text-gray-400 mt-1">
                    (Lower = Higher Priority)
                  </p>
                </div>
              </div>

              {/* Category Breakdowns */}
              <div className="space-y-3">
                {Object.entries(categories).map(([category, catData]) => {
                  const Icon = catData.icon;
                  const categoryVars = Object.entries(catData.variables);
                  const hasActiveWeights = categoryVars.some(
                    ([v]) => weights[v] > 0
                  );

                  if (!hasActiveWeights) return null;

                  return (
                    <div key={category} className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Icon
                          className={`mr-1 h-4 w-4 text-${catData.color}-600`}
                        />
                        {category}
                      </h4>

                      <div className="space-y-2">
                        {categoryVars.map(([variable, config]) => {
                          if (!weights[variable] || weights[variable] === 0)
                            return null;

                          const rawValue = selectedTractData[variable];
                          const score = selectedTractData.scores[variable] || 0;

                          return (
                            <div key={variable} className="text-xs">
                              <div className="flex justify-between mb-1">
                                <span
                                  className="text-gray-600"
                                  title={variable}
                                >
                                  {variable.length > 35
                                    ? variable.substring(0, 35) + "..."
                                    : variable}
                                </span>
                                <span className="font-medium">
                                  {typeof rawValue === "number"
                                    ? rawValue % 1 === 0
                                      ? rawValue
                                      : rawValue.toFixed(1)
                                    : rawValue}
                                  {variable.includes("Percent") ||
                                  variable.includes("%")
                                    ? "%"
                                    : ""}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${
                                    score >= 70
                                      ? "bg-green-500"
                                      : score >= 50
                                      ? "bg-yellow-500"
                                      : score >= 30
                                      ? "bg-orange-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Key Insights */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Key Insights
                </h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  {selectedTractData[
                    "Percent of Children Living Below Poverty Line"
                  ] > 20 && (
                    <li>
                      • High child poverty rate (
                      {selectedTractData[
                        "Percent of Children Living Below Poverty Line"
                      ]?.toFixed(1)}
                      %)
                    </li>
                  )}
                  {selectedTractData["Adults with Obesity"] > 35 && (
                    <li>
                      • Elevated obesity rate (
                      {selectedTractData["Adults with Obesity"]?.toFixed(1)}%)
                    </li>
                  )}
                  {selectedTractData["Adults that Binge Drinking"] > 20 && (
                    <li>
                      • High binge drinking rate (
                      {selectedTractData["Adults that Binge Drinking"]?.toFixed(
                        1
                      )}
                      %)
                    </li>
                  )}
                  {selectedTractData[
                    "Percent of Population without Internet Access"
                  ] > 15 && (
                    <li>
                      • Significant digital divide (
                      {selectedTractData[
                        "Percent of Population without Internet Access"
                      ]?.toFixed(1)}
                      % without internet)
                    </li>
                  )}
                  {selectedTractData["Lack of Health Insurance"] > 10 && (
                    <li>
                      • Healthcare access concern (
                      {selectedTractData["Lack of Health Insurance"]?.toFixed(
                        1
                      )}
                      % uninsured)
                    </li>
                  )}
                  {selectedTractData["Adults with Depression"] > 20 && (
                    <li>
                      • High depression rate (
                      {selectedTractData["Adults with Depression"]?.toFixed(1)}
                      %)
                    </li>
                  )}
                  {selectedTractData["Percent of Households with No Vehicle"] >
                    10 && (
                    <li>
                      • Transportation barriers (
                      {selectedTractData[
                        "Percent of Households with No Vehicle"
                      ]?.toFixed(1)}
                      % without vehicle)
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Map below the three columns */}
      <div className="mt-8">
        <ArcGISWebMap
          selectedTract={selectedTract}
          tractData={selectedTractData}
        />
      </div>
    </div>
  );
};

export default DynamicRankingSystem;
