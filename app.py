from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
from dotenv import load_dotenv
from groq import Groq
import os
import base64
import json
import re
from datetime import datetime

# ==================== LOAD ENV ====================
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in .env - AI features will be disabled")
    groq_client = None
else:
    groq_client = Groq(api_key=GROQ_API_KEY)

# ==================== APP ====================
app = FastAPI(
    title="Lab Report Analyzer - AI-Powered Clinical Insights",
    description="Automated lab analysis with pattern recognition",
    version="1.0.0"
)

# ==================== CORS - FIXED ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== REFERENCE RANGES DATABASE ====================
REFERENCE_RANGES = {
    "CBC": {
        "Hemoglobin": {"male": (13.5, 17.5), "female": (12.0, 15.5), "unit": "g/dL"},
        "RBC": {"male": (4.5, 5.9), "female": (4.1, 5.1), "unit": "million/μL"},
        "WBC": {"both": (4.0, 11.0), "unit": "thousand/μL"},
        "Platelets": {"both": (150, 400), "unit": "thousand/μL"},
        "MCV": {"both": (80, 100), "unit": "fL"},
        "MCH": {"both": (27, 33), "unit": "pg"},
        "MCHC": {"both": (32, 36), "unit": "g/dL"},
        "Neutrophils": {"both": (40, 70), "unit": "%"},
        "Lymphocytes": {"both": (20, 40), "unit": "%"},
    },
    "LFT": {
        "ALT": {"both": (7, 56), "unit": "U/L"},
        "AST": {"both": (10, 40), "unit": "U/L"},
        "ALP": {"both": (44, 147), "unit": "U/L"},
        "Bilirubin_Total": {"both": (0.1, 1.2), "unit": "mg/dL"},
        "Bilirubin_Direct": {"both": (0.0, 0.3), "unit": "mg/dL"},
        "Total_Protein": {"both": (6.0, 8.3), "unit": "g/dL"},
        "Albumin": {"both": (3.5, 5.5), "unit": "g/dL"},
        "GGT": {"both": (8, 61), "unit": "U/L"},
    },
    "KFT": {
        "Creatinine": {"male": (0.7, 1.3), "female": (0.6, 1.1), "unit": "mg/dL"},
        "BUN": {"both": (7, 20), "unit": "mg/dL"},
        "Uric_Acid": {"male": (3.5, 7.2), "female": (2.6, 6.0), "unit": "mg/dL"},
        "Sodium": {"both": (136, 145), "unit": "mEq/L"},
        "Potassium": {"both": (3.5, 5.0), "unit": "mEq/L"},
        "Chloride": {"both": (98, 107), "unit": "mEq/L"},
        "Calcium": {"both": (8.5, 10.5), "unit": "mg/dL"},
    },
    "Lipid": {
        "Total_Cholesterol": {"both": (125, 200), "unit": "mg/dL"},
        "LDL": {"both": (0, 100), "unit": "mg/dL"},
        "HDL": {"male": (40, 999), "female": (50, 999), "unit": "mg/dL"},
        "Triglycerides": {"both": (0, 150), "unit": "mg/dL"},
        "VLDL": {"both": (2, 30), "unit": "mg/dL"},
    },
    "Thyroid": {
        "TSH": {"both": (0.4, 4.0), "unit": "μIU/mL"},
        "T3": {"both": (80, 200), "unit": "ng/dL"},
        "T4": {"both": (5.0, 12.0), "unit": "μg/dL"},
        "Free_T3": {"both": (2.3, 4.2), "unit": "pg/mL"},
        "Free_T4": {"both": (0.8, 1.8), "unit": "ng/dL"},
    },
    "Glucose": {
        "Fasting_Glucose": {"both": (70, 100), "unit": "mg/dL"},
        "HbA1c": {"both": (4.0, 5.6), "unit": "%"},
        "Random_Glucose": {"both": (70, 140), "unit": "mg/dL"},
    }
}

# ==================== REQUEST SCHEMAS ====================
class LabValue(BaseModel):
    test_name: str
    value: float
    unit: str
    panel: str

class AnalyzeLabRequest(BaseModel):
    patient_age: int
    patient_gender: str
    lab_values: List[LabValue]
    previous_reports: Optional[List[Dict]] = None
    current_medications: Optional[List[str]] = None

# ==================== HELPER FUNCTIONS ====================
def calculate_egfr(creatinine: float, age: int, gender: str, is_african_american: bool = False):
    """Calculate estimated Glomerular Filtration Rate"""
    try:
        k = 0.7 if gender == "female" else 0.9
        alpha = -0.329 if gender == "female" else -0.411
        gender_factor = 1.018 if gender == "female" else 1.0
        race_factor = 1.159 if is_african_american else 1.0
        
        egfr = 141 * min(creatinine/k, 1)**alpha * max(creatinine/k, 1)**(-1.209) * 0.993**age * gender_factor * race_factor
        return round(egfr, 1)
    except Exception as e:
        print(f"eGFR calculation error: {e}")
        return None

def calculate_cholesterol_ratios(lipid_values: Dict):
    """Calculate cardiac risk ratios"""
    ratios = {}
    try:
        if "Total_Cholesterol" in lipid_values and "HDL" in lipid_values and lipid_values["HDL"] != 0:
            ratios["TC_HDL_Ratio"] = round(lipid_values["Total_Cholesterol"] / lipid_values["HDL"], 2)
        if "LDL" in lipid_values and "HDL" in lipid_values and lipid_values["HDL"] != 0:
            ratios["LDL_HDL_Ratio"] = round(lipid_values["LDL"] / lipid_values["HDL"], 2)
        if "Triglycerides" in lipid_values and "HDL" in lipid_values and lipid_values["HDL"] != 0:
            ratios["TG_HDL_Ratio"] = round(lipid_values["Triglycerides"] / lipid_values["HDL"], 2)
    except Exception as e:
        print(f"Cholesterol ratio calculation error: {e}")
    return ratios

def classify_severity(value: float, ref_range: tuple, is_critical: bool = False):
    """Classify abnormality severity with clinically accurate terminology"""
    low, high = ref_range
    
    if low <= value <= high:
        return {"severity": "normal", "color": "green", "critical": False}
    
    if value < low:
        diff_percent = ((low - value) / low) * 100
        if is_critical or diff_percent > 50:
            return {"severity": "severely low", "color": "red", "critical": True}
        elif diff_percent > 25:
            return {"severity": "moderately low", "color": "orange", "critical": False}
        else:
            return {"severity": "mildly low", "color": "yellow", "critical": False}
    
    if value > high:
        diff_percent = ((value - high) / high) * 100
        if is_critical or diff_percent > 50:
            return {"severity": "severely elevated", "color": "red", "critical": True}
        elif diff_percent > 25:
            return {"severity": "moderately elevated", "color": "orange", "critical": False}
        else:
            return {"severity": "mildly elevated", "color": "yellow", "critical": False}

def check_abnormalities(lab_values: List[LabValue], age: int, gender: str):
    """Check all values against reference ranges"""
    abnormalities = []
    all_results = {}
    critical_values = []
    
    CRITICAL_THRESHOLDS = {
        "Hemoglobin": (7.0, 20.0),
        "WBC": (2.0, 30.0),
        "Platelets": (50, 1000),
        "Potassium": (2.5, 6.5),
        "Sodium": (120, 160),
        "Creatinine": (0.0, 5.0),
        "Glucose": (40, 400),
        "Bilirubin_Total": (0.0, 3.0),
        "AST": (0.0, 300),
        "ALT": (0.0, 300),
    }
    
    for lab in lab_values:
        panel_refs = REFERENCE_RANGES.get(lab.panel, {})
        test_ref = panel_refs.get(lab.test_name)
        
        if not test_ref:
            continue
        
        if "both" in test_ref:
            ref_range = test_ref["both"]
        else:
            ref_range = test_ref.get(gender.lower(), test_ref.get("male"))
        
        is_critical_test = lab.test_name in CRITICAL_THRESHOLDS
        severity_info = classify_severity(lab.value, ref_range, is_critical_test)
        
        result = {
            "test": lab.test_name,
            "value": lab.value,
            "unit": lab.unit,
            "panel": lab.panel,
            "reference_range": f"{ref_range[0]}-{ref_range[1]} {test_ref['unit']}",
            **severity_info
        }
        
        all_results[lab.test_name] = result
        
        if severity_info["severity"] != "normal":
            abnormalities.append(result)
        
        if severity_info["critical"]:
            critical_values.append(result)
    
    return all_results, abnormalities, critical_values

def interpret_egfr(egfr: float):
    """Interpret eGFR value"""
    if egfr is None:
        return None
    if egfr >= 90:
        return {"stage": "Normal", "description": "Normal kidney function", "color": "green"}
    elif egfr >= 60:
        return {"stage": "Stage 1-2", "description": "Mild kidney dysfunction", "color": "yellow"}
    elif egfr >= 30:
        return {"stage": "Stage 3", "description": "Moderate kidney dysfunction", "color": "orange"}
    elif egfr >= 15:
        return {"stage": "Stage 4", "description": "Severe kidney dysfunction", "color": "red"}
    else:
        return {"stage": "Stage 5", "description": "Kidney failure", "color": "red"}

def assess_cardiac_risk(ratios: Dict):
    """Assess cardiac risk from cholesterol ratios"""
    if "TC_HDL_Ratio" in ratios:
        ratio = ratios["TC_HDL_Ratio"]
        if ratio < 3.5:
            return {"risk": "Low", "color": "green"}
        elif ratio < 5.0:
            return {"risk": "Moderate", "color": "yellow"}
        else:
            return {"risk": "High", "color": "red"}
    return None

# ==================== MAIN ENDPOINTS ====================
@app.post("/analyze-lab")
async def analyze_lab(request: AnalyzeLabRequest):
    """Comprehensive lab analysis with AI insights"""
    try:
        print(f"Received request: {request.patient_age}yo {request.patient_gender}, {len(request.lab_values)} tests")
        
        # Check abnormalities
        all_results, abnormalities, critical_values = check_abnormalities(
            request.lab_values, 
            request.patient_age, 
            request.patient_gender
        )
        
        # Calculate eGFR if creatinine available
        egfr = None
        for lab in request.lab_values:
            if lab.test_name == "Creatinine":
                egfr = calculate_egfr(lab.value, request.patient_age, request.patient_gender)
                break
        
        # Calculate cholesterol ratios
        lipid_values = {lab.test_name: lab.value for lab in request.lab_values if lab.panel == "Lipid"}
        cholesterol_ratios = calculate_cholesterol_ratios(lipid_values) if lipid_values else {}
        
        # Generate AI analysis
        detailed_analysis = "Basic analysis complete. This decision support system provides insights for clinical review and does not constitute medical diagnosis or treatment directives."
        physician_summary = "CDSS Analysis: Findings warrant physician review. This summary provides decision support insights based on available data and does not constitute a definitive diagnosis."
        
        if groq_client:
            try:
                abnormal_summary = "\n".join([
                    f"- {a['test']}: {a['value']} {a['unit']} (Ref: {a['reference_range']}) - {a['severity']}"
                    for a in abnormalities
                ])
                
                meds_context = f"\nCurrent Medications: {', '.join(request.current_medications)}" if request.current_medications else ""
                
                analysis_prompt = f"""You are a Clinical Decision Support System (CDSS) analyzing lab results for {request.patient_age}yo {request.patient_gender}:
{meds_context}

ABNORMAL VALUES:
{abnormal_summary if abnormalities else "All values within normal range"}

ALL TESTS PROVIDED:
{', '.join([r['test'] for r in all_results.values()])}

CRITICAL CDSS COMPLIANCE RULES:
1. NEVER state diagnoses - use "suggestive of", "raises concern for", "may be consistent with", "warrants evaluation for"
2. NEVER give direct treatment orders - use "clinician review recommended", "consideration of", "warrants discussion of"
3. For bilirubin >2.0 mg/dL, use "moderately elevated" or "clinically significant elevation" (never "mildly elevated")
4. If ALT is NOT in provided tests, state: "ALT was not available in the current report and should be obtained for AST/ALT ratio assessment"
5. Always connect patient context (age, gender, medications) to clinical findings
6. Use precise severity: mild (<25% outside range), moderate (25-50%), severe (>50%)

Provide CDSS-appropriate clinical interpretation covering:
1. Anemia patterns (if CBC abnormal) - "findings suggestive of [type]" with MCV/MCH evidence
2. Liver function (if LFT abnormal) - "pattern raises concern for hepatocellular vs cholestatic injury", calculate AST/ALT ratio if both available
3. Kidney function (if KFT abnormal) - "findings warrant evaluation for acute vs chronic kidney disease"
4. Metabolic/endocrine findings - "results suggest consideration of cardiovascular risk assessment"
5. Clinical correlations - "In context of [patient factors], findings raise concern for [condition] among other possibilities"
6. Recommended follow-up - "Clinician may consider [tests]" with suggested timeline

Frame ALL recommendations as decision support, not medical directives. Be precise, evidence-based, and CDSS-compliant."""

                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": analysis_prompt}],
                    temperature=0.3,
                    max_tokens=2000
                )
                detailed_analysis = completion.choices[0].message.content.strip()
                
                # Generate summary with CDSS framing
                summary_prompt = f"""Create a CDSS-compliant 150-word physician summary.

**CRITICAL: This is Clinical Decision Support, NOT a diagnosis or treatment directive.**

Patient: {request.patient_age}yo {request.patient_gender}
Medications: {', '.join(request.current_medications) if request.current_medications else 'None reported'}

Analysis:
{detailed_analysis}

Required Format:
- Opening: "This decision support summary provides insights based on available data and does not constitute a definitive diagnosis."
- Key Findings: Use "suggestive of", "raises concern for", "warrants evaluation for"
- Clinical Significance: Connect to patient context without diagnosing
- Recommended Actions: Use "clinician may consider", "review recommended", "discussion warranted"
- Follow-up: Suggest tests/timeline without commanding

NEVER use: "diagnose", "treat with", "discontinue", "start medication"
ALWAYS use: "suggests", "warrants", "may consider", "review recommended"

Be precise, evidence-based, and CDSS-compliant."""
                summary_completion = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": summary_prompt}],
                    temperature=0.2,
                    max_tokens=300
                )
                physician_summary = summary_completion.choices[0].message.content.strip()
                
            except Exception as e:
                print(f"AI analysis error: {e}")
                detailed_analysis = f"AI analysis error: {str(e)}. Basic results available."
        
        return {
            "status": "success",
            "analysis_date": datetime.now().isoformat(),
            "patient_info": {
                "age": request.patient_age,
                "gender": request.patient_gender
            },
            "results_summary": {
                "total_tests": len(request.lab_values),
                "abnormal_count": len(abnormalities),
                "critical_count": len(critical_values),
                "normal_count": len(request.lab_values) - len(abnormalities)
            },
            "all_results": all_results,
            "abnormalities": abnormalities,
            "critical_values": critical_values,
            "calculated_metrics": {
                "egfr": egfr,
                "egfr_interpretation": interpret_egfr(egfr) if egfr else None,
                "cholesterol_ratios": cholesterol_ratios,
                "cardiac_risk": assess_cardiac_risk(cholesterol_ratios) if cholesterol_ratios else None
            },
            "detailed_analysis": detailed_analysis,
            "physician_summary": physician_summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/reference-ranges")
async def get_reference_ranges():
    """Get all reference ranges"""
    return {"status": "success", "ranges": REFERENCE_RANGES}

@app.get("/")
async def root():
    return {
        "message": "Lab Report Analyzer API v1.0",
        "status": "operational",
        "groq_enabled": groq_client is not None,
        "endpoints": ["/analyze-lab", "/reference-ranges"]
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Lab Analyzer API on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)