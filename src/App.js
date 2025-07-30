import React, { useState, useEffect, useMemo, useRef, } from "react";
import './styles.css';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
  X,
  HelpCircle,
} from "lucide-react";

// ArcGIS Map Component
import "@arcgis/map-components/dist/components/arcgis-map";
import "@arcgis/map-components/dist/components/arcgis-zoom";

const ArcGISWebMap = ({ selectedTract, tractData, setSelectedTract, data }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const highlightHandle = useRef(null); // Store the highlight handle

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

      // Add click event listener to the view
view.on("click", async (event) => {
  console.log("Map clicked!");
  
  // Perform a hit test to see what was clicked
  const response = await view.hitTest(event);
  console.log("Hit test results:", response.results.length);
  
  // Filter for features from your tract layer
  const tractHits = response.results.filter(result => 
    result.graphic && 
    result.graphic.layer && 
    (result.graphic.layer.title?.toLowerCase().includes("tract") || 
     result.graphic.layer.title?.toLowerCase().includes("census") ||
     result.graphic.layer.type === "feature")
  );
  
  if (tractHits.length > 0) {
    // Get the GEOID from the clicked feature
    const clickedFeature = tractHits[0].graphic;
    console.log("Clicked feature attributes:", clickedFeature.attributes);
    
    const geoid = clickedFeature.attributes.GEOID || 
                  clickedFeature.attributes.GEOID10 || 
                  clickedFeature.attributes.GEOID20 ||
                  clickedFeature.attributes.GEOID_Data;
    
    if (geoid) {
      console.log("Found GEOID:", geoid);
      // Update React state to highlight in the app
      setSelectedTract(geoid);
    }
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
      
      // Clear previous highlight
      if (highlightHandle.current) {
        highlightHandle.current.remove();
        highlightHandle.current = null;
      }
      
      // Find the tract layer
      const tractLayer = view.map.layers.find(layer => 
        layer.title?.toLowerCase().includes("tract") || 
        layer.title?.toLowerCase().includes("census") ||
        layer.type === "feature"
      );

      if (tractLayer) {
        console.log("Using layer:", tractLayer.title);
        
        try {
          await tractLayer.load();
          
          // Get the layer view for highlighting
          const layerView = await view.whenLayerView(tractLayer);
          
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
            
            // Zoom to the feature
            await view.goTo({
              target: results.features[0].geometry,
              zoom: 12
            });
            
            // Highlight the feature
            highlightHandle.current = layerView.highlight(results.features[0]);
            console.log("Highlight applied!");
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

  useEffect(() => {
    if (!mapLoaded) return;
    
    const mapElement = mapRef.current;
    if (!mapElement || !mapElement.view) return;
    
    const view = mapElement.view;
    
    // Set up click handler
    const clickHandler = view.on("click", async (event) => {
      try {
        const response = await view.hitTest(event);
        
        // Look for clicks on the tract layer
        for (const result of response.results) {
          if (result.graphic?.layer?.title?.includes("Tract") || 
              result.graphic?.layer?.title?.includes("Join")) {
            
            const objectId = result.graphic.attributes.OBJECTID;
            const layer = result.graphic.layer;
            
            // Query for the full feature
            const query = layer.createQuery();
            query.where = `OBJECTID = ${objectId}`;
            query.outFields = ["GEOID"];
            query.returnGeometry = false;
            
            const featureSet = await layer.queryFeatures(query);
            
            if (featureSet.features.length > 0) {
              const geoid = featureSet.features[0].attributes.GEOID;

              if (geoid) {
                console.log("Found GEOID:", geoid);
                console.log("Sample GEOIDs from CSV data:", data.slice(0, 5).map(d => d.GEOID));
                console.log("Does this GEOID exist in data?", data.some(d => d.GEOID === geoid));
                setSelectedTract(geoid);
                return; // Stop after finding first match
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in click handler:", error);
      }
    });
    
    // Cleanup
    return () => {
      if (clickHandler) {
        clickHandler.remove();
      }
    };
  }, [mapLoaded, setSelectedTract, data]);

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
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [hoveredMetric, setHoveredMetric] = useState(null);
    const [comparisonTracts, setComparisonTracts] = useState([]);
    const [showComparison, setShowComparison] = useState(false);
    const [trayMinimized, setTrayMinimized] = useState(true);

  
    // Comprehensive variable categories with variables from dataset csv
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
            " Renter households Aged 65+": { weight: 3, inverted: true },
            "Owner Households Aged 65+": {
              weight: 2,
              inverted: false,
            },
            " Population Aged 60+ In Poverty": { weight: 3, inverted: true },
            "Population Aged 65+ Living Alone": {
              weight: 4,
              inverted: true,
            },
            "Percent Aged 60+ Households w/ Income Below Poverty": {
              weight: 5,
              inverted: true,
            },
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
            "Percent Households Living Below Poverty ": {
              weight: 6,
              inverted: true,
            },
            "2024 Avg Value of Household Credit Card Debt": {
              weight: 3,
              inverted: true,
            },
            "2024 Average Value Household Student Loans": {
              weight: 3,
              inverted: true,
            },
            "Count of Children Living Below Poverty Line": {
              weight: 7,
              inverted: true,
            },
          },
        },
        "Housing & Transportation": {
          icon: Home,
          color: "orange",
          variables: {
            "Percent Homeownership Rate": { weight: 3, inverted: false },
            "Percent Renter Rate": { weight: 2, inverted: true },
            "Percent of Households with No Vehicle": { weight: 5, inverted: true },
            "Percent of Workers Commuting 90+ Minutes ": {
              weight: 3,
              inverted: true,
            },
          },
        },
        "Insurance Coverage": {
          icon: Shield,
          color: "teal",
          variables: {
            "Percent Population w/ Medicaid (Means Tested Public Coverage_": {
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
            "Percent of Population Graduated High School": {
              weight: 3,
              inverted: false,
            },
            "Percent of Population Graduated College": {
              weight: 5,
              inverted: false,
            },
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
  
      const expanded = {};
      Object.keys(categories).forEach((cat) => {
        expanded[cat] = false;
      });
      setExpandedCategories(expanded);
    }, []);

    useEffect(() => {
      const hideWelcome = localStorage.getItem('hideWelcomeModal');
      if (hideWelcome === 'true') {
        setIsModalOpen(false);
      }
    }, []);
    useEffect(() => {
        const loadData = () => {
            // Use Papa Parse library loaded in index.html
            window.Papa.parse("/artifact_test_Sheet17.csv", {
                download: true,       
                header: true,         
                skipEmptyLines: true, 
                dynamicTyping: true,  
                complete: (results) => {
                    const validData = results.data.filter(row => row && row.GEOID);
    
                    console.log("Loaded", validData.length, "census tracts with Papa Parse.");
    
                    // DEBUG 
                    if (validData.length > 0) {
                        console.log("Headers from CSV:", Object.keys(validData[0]));
                    }
    
                    setData(validData);
    
                    if (validData.length > 0) {
                        setSelectedTract(validData[0].GEOID);
                    }
                },
                error: (error) => {
                    console.error("Error parsing CSV:", error);
                },
            });
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
      if (!data.length || !Object.keys(weights).length) return { data: [], ranges: {} };
        
      const allVariables = [];
      Object.entries(categories).forEach(([category, catData]) => {
        Object.keys(catData.variables).forEach((variable) => {
          allVariables.push({ variable, ...catData.variables[variable] });
        });
      });
  
      const ranges = {};
      allVariables.forEach(({ variable }) => {
        const values = data
          .map((d) => d[variable])
          .filter((v) => typeof v === 'number' && !isNaN(v));
        if (values.length > 0) {
          ranges[variable] = {
            min: Math.min(...values),
            max: Math.max(...values),
          };
        }
      });
  
      const scored = data.map((tract) => {
        let totalScore = 0;
        let totalWeight = 0;
        const scores = {};
  
        allVariables.forEach(({ variable, inverted }) => {
          const value = tract[variable];
          const weight = weights[variable] || 0;
  
          if (typeof value === 'number' && !isNaN(value) && weight > 0 && ranges[variable]) {
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
        
        // This new object will hold the simple normalized value (0-100) 
        // for bar width, representing pure magnitude.
        const valueForWidth = {};
        allVariables.forEach(({ variable }) => {
            const value = tract[variable];
            if (typeof value === 'number' && !isNaN(value) && ranges[variable]) {
                const range = ranges[variable];
                if (range.max > range.min) {
                    valueForWidth[variable] = ((value - range.min) / (range.max - range.min)) * 100;
                } else {
                    valueForWidth[variable] = 50; // Default to 50% if no range
                }
            } else {
                 valueForWidth[variable] = 0;
            }
        });

        return {
          ...tract,
          compositeScore,
          scores,
          valueForWidth, // Add the new object to the tract data
        };
      });
  
      const sortedData = scored
      .sort((a, b) => a.compositeScore - b.compositeScore)
      .map((tract, index) => ({ ...tract, rank: index + 1 }));
      
    return { data: sortedData, ranges };
    }, [data, weights]);
  
    const applyPreset = (presetKey) => {
      setPreset(presetKey);
      if (presetKey !== 'custom' && presets[presetKey]) {
        setWeights(presets[presetKey].weights());
      }
      // If 'custom' is selected, keep the current weights
    };
        // ADD THIS FUNCTION HERE
    const handleWeightChange = (variable, value) => {
      setWeights((prev) => ({ ...prev, [variable]: value }));
      setPreset("custom");
    };

    
  
    const toggleCategory = (category) => {
      setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
    };
  
    const selectedTractData = rankedData.data.find((t) => t.GEOID === selectedTract);
    const { ranges } = rankedData;  
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
  
    const displayedRankings = showAllRankings
      ? rankedData.data
      : rankedData.data.slice(0, 10);
    // Draggable Tract Component
    const DraggableTract = ({ tract }) => {
      const [{ isDragging }, drag] = useDrag({
        type: 'tract',
        item: { tract },
        collect: (monitor) => ({
          isDragging: monitor.isDragging(),
        }),
      });

      return (
        <div
          ref={drag}
          onClick={() => setSelectedTract(tract.GEOID)}
          className={`p-3 border rounded-lg cursor-pointer transition-all ${
            selectedTract === tract.GEOID
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          } ${isDragging ? 'opacity-50' : ''}`}
          style={{ cursor: 'move' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getRankColor(
                  tract.rank,
                  rankedData.data.length
                )}`}
              >
                {tract.rank}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {tract.NAME || `Tract ${tract.GEOID}`}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {tract.County}, {tract.State}
                </p>
              </div>
            </div>
            <div className="text-right ml-2">
              <p
                className={`text-lg font-bold ${getScoreColor(
                  tract.compositeScore
                )}`}
              >
                {tract.compositeScore.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Index</p>
            </div>
          </div>

          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-red-500 to-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${tract.compositeScore}%` }}
            ></div>
          </div>
        </div>
      );
    };

    // Comparison Tray Component
    // Comparison Tray Component
    // Comparison Tray Component
    const ComparisonTray = () => {
      const [{ isOver }, drop] = useDrop({
        accept: 'tract',
        drop: (item) => {
          if (comparisonTracts.length < 3 && !comparisonTracts.find(t => t.GEOID === item.tract.GEOID)) {
            setComparisonTracts([...comparisonTracts, item.tract]);
            // Expand tray when item is dropped
            setTrayMinimized(false);
          }
        },
        collect: (monitor) => ({
          isOver: monitor.isOver(),
        }),
      });

      return (
        <div
          ref={drop}
          className={`fixed bottom-0 left-0 right-0 bg-white border-t-2 shadow-lg transition-all ${
            isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          style={{ height: trayMinimized ? '48px' : (comparisonTracts.length > 0 || isOver ? '170px' : '100px') }}        >
          <div className="max-w-7xl mx-auto px-4">
            {trayMinimized ? (
              // Minimized view
              <div className="flex items-center justify-between h-12">
                <button
                  onClick={() => setTrayMinimized(false)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <ChevronUp className="h-6 w-6 font-bold" strokeWidth={3} /> {/* Bigger and bolder */}
                  <span className="font-semibold">
                    Compare Neighborhoods ({comparisonTracts.length}/3)
                  </span>
                  {comparisonTracts.length > 0 && (
                    <span className="text-sm text-gray-500">
                      - {comparisonTracts.map(t => t.NAME || `Tract ${t.GEOID}`).join(', ')}
                    </span>
                  )}
                </button>
                {comparisonTracts.length >= 2 && (
                  <button
                    onClick={() => setShowComparison(true)}
                    className="px-4 py-1 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                    style={{ backgroundColor: '#6D9DB2' }}
                  >
                    Compare Now →
                  </button>
                )}
              </div>
            ) : (
              // Expanded view
              <>
                <div className="flex items-center justify-between mb-2 pt-4">
                  <h3 className="font-semibold text-gray-800">
                    Compare Neighborhoods ({comparisonTracts.length}/3)
                  </h3>
                  <div className="flex items-center gap-2">
                    {comparisonTracts.length >= 2 && (
                      <button
                        onClick={() => setShowComparison(true)}
                        className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#6D9DB2' }}
                      >
                        Compare Now →
                      </button>
                    )}
                    <button
                      onClick={() => setTrayMinimized(true)}
                      className="p-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded" 
                      title="Minimize comparison tray"
                    >
                      <ChevronDown className="h-6 w-6 font-bold" strokeWidth={3} /> {/* Bigger and bolder */}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  {[0, 1, 2].map((index) => {
                    const tract = comparisonTracts[index];
                    return (
                      <div
                        key={index}
                        className={`flex-1 border-2 border-dashed rounded-lg p-3 ${
                          tract ? 'border-gray-300 bg-gray-50' : 'border-gray-300'
                        }`}
                      >
                        {tract ? (
                          <div className="relative">
                            <button
                              onClick={() => setComparisonTracts(comparisonTracts.filter(t => t.GEOID !== tract.GEOID))}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                            <p className="font-medium text-sm truncate">{tract.NAME || `Tract ${t.GEOID}`}</p>
                            <p className="text-xs text-gray-500">Index: {tract.compositeScore.toFixed(1)}</p>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm text-center">
                            {index === 0 ? 'Drag neighborhood here' : 'Empty slot'}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      );
    };
    // Comparison Modal window
const ComparisonModal = () => {
  if (!showComparison || comparisonTracts.length < 2) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Neighborhood Comparison</h2>
            <button
              onClick={() => setShowComparison(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Metric</th>
                  {comparisonTracts.map((tract) => (
                    <th key={tract.GEOID} className="text-center p-2">
                      {tract.NAME || `Tract ${tract.GEOID}`}
                      <br />
                      <span className="text-sm font-normal text-gray-500">
                        Index: {tract.compositeScore.toFixed(1)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(categories).map(([category, catData]) => {
                  const categoryVars = Object.entries(catData.variables);
                  const hasActiveWeights = categoryVars.some(([v]) => weights[v] > 0);
                  
                  if (!hasActiveWeights) return null;
                  
                  return (
                    <React.Fragment key={category}>
                      <tr className="bg-gray-100">
                        <td colSpan={comparisonTracts.length + 1} className="p-2 font-semibold">
                          {category}
                        </td>
                      </tr>
                      {categoryVars.map(([variable, config]) => {
                        if (!weights[variable] || weights[variable] === 0) return null;
                        
                        return (
                          <tr key={variable} className="border-b">
                            <td className="p-2 text-sm">{variable}</td>
                            {comparisonTracts.map((tract) => {
                              const value = tract[variable];
                              const score = tract.scores?.[variable] || 0;
                              
                              return (
                                <td key={tract.GEOID} className="text-center p-2">
                                  <div className={`font-medium ${getScoreColor(score)}`}>
                                    {typeof value === 'number' ? value.toFixed(1) : value}
                                    {variable.toLowerCase().includes('percent') || 
                                     variable.toLowerCase().includes('%') || 
                                     variable.startsWith('Adults') ? '%' : ''}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Index: {score.toFixed(1)}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowComparison(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
    
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen" style={{ paddingBottom: '200px' }}>
      
            {/* Welcome Modal */}
    {isModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Welcome to the Neighborhood Needs Assessment Tool</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4 text-gray-600">
              <p className="text-lg">
                This tool helps identify communities where targeted resources can make the greatest impact based on multiple health, economic, and social factors.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>Adjust Weights (0-15 scale):</strong> Use the sliders on the left to set how important each factor is to your analysis. Higher numbers = more influence on the final priority level. For example:
                  <ul className="ml-6 mt-1 text-xs text-gray-600">
                    <li>• Setting "Adults with Diabetes" to 15 makes it a critical factor</li>
                    <li>• Setting it to 0 removes it from the calculation entirely</li>
                    <li>• All factors work together - calculating community needs in real-time based on your weights</li>
                  </ul>
                </li>
                <li><strong>Apply Policy Priorities:</strong> Use preset configurations that automatically set weights for specific goals. For example, "Health Crisis Response" gives maximum weight to chronic conditions and healthcare access. You can change the weights to fit your policy goals.</li>
                <li><strong>View Combined Results:</strong> The tool calculates a composite community intervention index (0-100) for each neighborhood by:
                  <ul className="ml-6 mt-1 text-xs text-gray-600">
                    <li>• Normalizing each factor's data across all neighborhoods in Norfolk</li>
                    <li>• Applying your weights to determine importance</li>
                    <li>• Combining all weighted factors into one priority level</li>
                  </ul>
                </li>
                <li><strong>Explore Communities:</strong> Click any neighborhood to see how each factor contributes to its overall priority level relative to other neighborhoods, with bars showing both the raw data and its weighted impact.</li>
              </ol>
              </div>
              
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Understanding the Vulnerability Indicators:</h3>
                <ul className="space-y-1 text-sm">
                  <li>• <span className="text-red-600 font-semibold">Red (0-30):</span> Highest priority</li>
                  <li>• <span className="text-orange-600 font-semibold">Orange (31-50):</span> High priority areas</li>
                  <li>• <span className="text-yellow-600 font-semibold">Yellow (51-70):</span> Moderate priority areas</li>
                  <li>• <span className="text-green-600 font-semibold">Green (71-100):</span> Standard priority areas</li>
                </ul>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Support Our Mission:</h3>
              <p className="text-sm">
                This tool is made freely available for the public as part of CityWork's mission to democratize data back into the hands of communities. If you find it helpful, please consider{" "}
                <a 
                  href="https://buy.stripe.com/14k02idFxcgu0k83cc" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 font-semibold hover:text-purple-800 underline"
                >
                  donating to support us
                </a>.
              </p>
            </div>
              
              <div className="text-xs text-gray-500 border-t pt-4">
                <p className="mb-2">
                <strong>Data Usage:</strong> Uses public census and health data (2022-2024). No personal info collected. All communities have strengths— this tool simply helps direct resources to amplify existing capacity.                </p>
                <p>
                  <strong>Terms of Use:</strong> For community benefit only. Verify findings before policy decisions. Exploitative use violates our terms and incurs a $1 billion fine to be used for supportive housing. 
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="mr-2"
                />
                Don't show this again
              </label>
              <button
                onClick={() => {
                  if (dontShowAgain) {
                    localStorage.setItem('hideWelcomeModal', 'true');
                  }
                  setIsModalOpen(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    
       <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <a href="https://www.citywork.io/" target="_blank" rel="noopener noreferrer">
            <img src="/CityWorkLogoFinal.png" alt="Company Logo" className="h-20 hover:opacity-80 transition-opacity cursor-pointer" />
          </a>
            <h1 className="text-3xl font-bold text-gray-800">
            Neighborhood Needs Assessment Tool 
            </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="ml-auto p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              title="Help & Instructions"
            >
              <HelpCircle className="h-6 w-6 text-blue-600" />
            </button>
            <button
              onClick={() => window.open('https://www.citywork.io/contact', '_blank')}
              className="ml-2 px-4 py-2 text-white rounded-lg transition-colors shadow-md"
              style={{ backgroundColor: '#326680' }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#346983'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#6D9DB2'}
            >
              Want One For Your City?
            </button>
          </div>
          <p className="text-gray-600">
            Multi-factor analysis to connect resources to communities.
          </p>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="bg-white rounded-lg shadow-lg p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <Target className="mr-2 h-5 w-5" />
              Priority Weights
            </h2>
  
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
                      <div className="flex items-center min-w-0">
                        <Icon
                          className={`mr-2 h-5 w-5 text-${catData.color}-600 flex-shrink-0`}
                        />
                        <span className="font-medium text-gray-800 text-sm truncate">
                          {category}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({Object.keys(catData.variables).length})
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
  
                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {Object.entries(catData.variables).map(
                          ([variable, config]) => (
                            <div key={variable}>
                              <div className="flex items-start gap-4 mb-1">
                                <label
                                  className="flex-1 min-w-0 text-xs text-gray-700 flex items-center break-words"
                                  title={variable}
                                >
                                  {variable}
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
                {Object.keys(weights).length}
              </p>
            </div>
          </div>
  
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Neighborhood Rankings
              <span className="ml-2 text-sm text-gray-500">
                ({rankedData.data.length} tracts)
              </span>
            </h2>
  
            <div className="mb-3 text-xs text-gray-600">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              Lower Index = higher intervention priority
            </div>
  
            <div className="space-y-2 max-h-[65vh] overflow-y-auto">
            {displayedRankings.map((tract) => (
              <DraggableTract key={tract.GEOID} tract={tract} />
            ))}
            </div>
  
            {rankedData.data.length > 10 && (
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
                    Show All {rankedData.data.length} Tracts
                  </>
                )}
              </button>
            )}
          </div>
  
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
                      rankedData.data.length
                    )}`}
                  >
                    Index #{selectedTractData.rank} of {rankedData.data.length}
                  </div>
  
                  <div className="mt-3">
                    <p
                      className={`text-3xl font-bold ${getScoreColor(
                        selectedTractData.compositeScore
                      )}`}
                    >
                      {selectedTractData.compositeScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-500">Composite Index</p>
                    <p className="text-xs text-gray-400 mt-1">
                      (Lower = Higher Priority)
                    </p>
                  </div>
                </div>
  
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
                                <div className="flex items-start gap-4 mb-1">
                                  <span
                                    className="flex-1 min-w-0 text-gray-600 break-words"
                                    title={variable}
                                  >
                                    {variable}
                                  </span>
                                  <div className="relative">
                                    <span 
                                      className="font-medium cursor-help underline underline-offset-2 decoration-dotted decoration-gray-400"
                                      onMouseEnter={() => setHoveredMetric(variable)}
                                      onMouseLeave={() => setHoveredMetric(null)}
                                    >
                                      {(() => {
                                        const v = variable.toLowerCase();
                                        const isPercent =
                                        v.includes("percent") ||
                                        v.includes("%") ||
                                        v.startsWith("adults");
                                        if (typeof rawValue === "number") {
                                            let val = rawValue;
                                            // If the variable is explicitly marked as a decimal, convert it
                                            if (config.format === 'decimal') {
                                              val = val * 100;
                                            }
                                            return val % 1 === 0 ? val : val.toFixed(1);
                                          }
                                        return rawValue;
                                        })()}
                                        {(() => {
                                          const v = variable.toLowerCase();
                                          return (
                                            v.includes("percent") ||
                                            v.includes("%") ||
                                            v.startsWith("adults")
                                          )
                                            ? "%"
                                            : "";
                                        })()}
                                    </span>
                                    
                                    {/* Tooltip */}
                                    {hoveredMetric === variable && (
                                      <div className="absolute z-10 right-0 top-full mt-1 bg-gray-900 text-white p-2 rounded shadow-lg text-xs whitespace-nowrap">
                                        <div className="font-semibold mb-1">Norfolk Range:</div>
                                        <div>Low: {ranges[variable]?.min?.toFixed(1)}%</div>
                                        <div>High: {ranges[variable]?.max?.toFixed(1)}%</div>
                                        <div className="mt-1 pt-1 border-t border-gray-700">
                                          {(() => {
                                            const position = rankedData.data.filter(t => 
                                              typeof t[variable] === 'number' && !isNaN(t[variable])
                                            ).sort((a, b) => b[variable] - a[variable])
                                            .findIndex(t => t.GEOID === selectedTract) + 1;
                                            const total = rankedData.data.filter(t => 
                                              typeof t[variable] === 'number' && !isNaN(t[variable])
                                            ).length;
                                            return `Ranks ${position} of ${total} tracts`;
                                          })()}
                                        </div>
                                        {/* Arrow pointing up */}
                                        <div className="absolute -top-2 right-4 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className={`h-1 rounded-full ${
                                            (() => {
                                                if (score >= 70) return "bg-green-500";   // Green: Top 30% of scores
                                                if (score >= 40) return "bg-yellow-500";  // Yellow: 40-69 range
                                                if (score >= 15) return "bg-orange-500";  // Orange: 15-39 range
                                                return "bg-red-500";     
                                            })()
                                            }`}
                                            // Width is determined by the raw value's magnitude
                                            style={{ width: `${selectedTractData.valueForWidth?.[variable] ?? 0}%` }}
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
  
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Key Insights
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {selectedTractData[
                      "Count of Children Living Below Poverty Line"
                    ] > 20 && (
                      <li>
                        • High child poverty rate (
                        {selectedTractData[
                          "Count of Children Living Below Poverty Line"
                        ]?.toFixed(1)} # of Children)
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
        <div className="mt-8">
          <ArcGISWebMap
            selectedTract={selectedTract}
            tractData={selectedTractData}
            setSelectedTract={setSelectedTract}
            data={data}
          />
        </div>
          {/* Footer */}
      <div className="mt-8 bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-600">
        <p className="mb-2">
          © 2024 CityWork, LLC. Democratizing data for community change ✊
        </p>
        <div className="flex justify-center gap-4 text-xs">
          <a href="https://www.citywork.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
            Website
          </a>
          <span className="text-gray-400">|</span>
          <a href="https://www.citywork.io/contact" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
            Contact
          </a>
          <span className="text-gray-400">|</span>
          <a href="https://www.citywork.io/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
            Terms of Use
          </a>
          </div>
        </div>
        <ComparisonTray trayMinimized={trayMinimized} setTrayMinimized={setTrayMinimized} />
        <ComparisonModal />
      </div>
    </DndProvider>
  );
};
export default DynamicRankingSystem;
