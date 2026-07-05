// Generated from Group_Finance_FY27_v2_2 1.xlsx — FY27 budgets (Jul-26 → Jun-27), AUD ex-GST.
// Regenerate with the extraction script if the workbook changes.

export const FY27_MONTHS = ['Jul-26','Aug-26','Sep-26','Oct-26','Nov-26','Dec-26','Jan-27','Feb-27','Mar-27','Apr-27','May-27','Jun-27'] as const

export interface BudgetLine { label: string; months: number[] }
export interface BudgetGroup { name: string; lines: BudgetLine[] }
export interface BudgetSection { name: string; groups: BudgetGroup[] }
export interface CompanyBudget { sections: BudgetSection[] }

export const FY27_SEED: Record<string, CompanyBudget> = {
  "7even": {
    "sections": [
      {
        "name": "Revenue",
        "groups": [
          {
            "name": "Revenue",
            "lines": [
              {
                "label": "7even (Preston) \u2014 DM Fee (3% TDC)",
                "months": [
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0,
                  40000.0
                ]
              },
              {
                "label": "7even (Preston) \u2014 Admin Fee",
                "months": [
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0
                ]
              },
              {
                "label": "7even (Preston) \u2014 Marketing Fee",
                "months": [
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0
                ]
              },
              {
                "label": "7even (Preston) \u2014 Legal Fee",
                "months": [
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0
                ]
              },
              {
                "label": "7even (Caloundra) \u2014 DM Fee (3% TDC)",
                "months": [
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0,
                  10000.0
                ]
              },
              {
                "label": "7even (Caloundra) \u2014 Admin Fee",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "7even (Caloundra) \u2014 Marketing Fee",
                "months": [
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0
                ]
              },
              {
                "label": "7even (Caloundra) \u2014 Legal Fee",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "7even (Waurn Ponds) \u2014 DM Fee (3% TDC)",
                "months": [
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0,
                  30000.0
                ]
              },
              {
                "label": "7even (Waurn Ponds) \u2014 Admin Fee",
                "months": [
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0
                ]
              },
              {
                "label": "7even (Waurn Ponds) \u2014 Marketing Fee",
                "months": [
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0,
                  4000.0
                ]
              },
              {
                "label": "7even (Waurn Ponds) \u2014 Legal Fee",
                "months": [
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0
                ]
              },
              {
                "label": "Working Capital Injections",
                "months": [
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0,
                  50000.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Cost of Sales",
        "groups": [
          {
            "name": "Project Direct Costs",
            "lines": [
              {
                "label": "Consulting / specialist fees",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Legal (project-level)",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Due diligence costs",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Other direct project costs",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Operating Expenses",
        "groups": [
          {
            "name": "Wages & Salaries",
            "lines": [
              {
                "label": "Daniel Sette",
                "months": [
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0
                ]
              },
              {
                "label": "Jamie Baldwin",
                "months": [
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0
                ]
              },
              {
                "label": "Lewis Jin",
                "months": [
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0,
                  25000.0
                ]
              },
              {
                "label": "Admin / Accounts",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              }
            ]
          },
          {
            "name": "Superannuation",
            "lines": [
              {
                "label": "Admin / Accounts super",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Rent & Outgoings",
            "lines": [
              {
                "label": "Office rent",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              },
              {
                "label": "Outgoings / strata",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "Car parking",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Insurance",
            "lines": [
              {
                "label": "Professional indemnity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Public liability",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Business / contents",
                "months": [
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0
                ]
              },
              {
                "label": "Workers compensation",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Motor vehicle insurance",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Motor Vehicles",
            "lines": [
              {
                "label": "Vehicle lease / Defender",
                "months": [
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0
                ]
              },
              {
                "label": "Vehicle lease / Range Rover",
                "months": [
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0
                ]
              },
              {
                "label": "Vehicle lease / SQ8",
                "months": [
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0
                ]
              },
              {
                "label": "Fuel & running costs",
                "months": [
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0
                ]
              },
              {
                "label": "Tolls",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Registration & CTP",
                "months": [
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0
                ]
              }
            ]
          },
          {
            "name": "IT & Software",
            "lines": [
              {
                "label": "Hardware / equipment",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Other IT costs",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Subscriptions & Services",
            "lines": [
              {
                "label": "Xero subscription",
                "months": [
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0
                ]
              },
              {
                "label": "Claude AI",
                "months": [
                  30.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Adobe Acrobat",
                "months": [
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0
                ]
              },
              {
                "label": "Office 365 / Technicalities",
                "months": [
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0
                ]
              },
              {
                "label": "Estatemaster",
                "months": [
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0
                ]
              },
              {
                "label": "Landchecker",
                "months": [
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0
                ]
              },
              {
                "label": "Hetzner Online",
                "months": [
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0,
                  15.0
                ]
              },
              {
                "label": "Canva",
                "months": [
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0,
                  70.0
                ]
              },
              {
                "label": "Other subscriptions",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Marketing & BD",
            "lines": [
              {
                "label": "Digital / online marketing",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Print / collateral",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "BD materials",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Events / conferences",
                "months": [
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0
                ]
              }
            ]
          },
          {
            "name": "Entertainment",
            "lines": [
              {
                "label": "Client dining / restaurants",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "LaTrobe Membership (Daniel)",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "LaTrobe Membership (Jamie)",
                "months": [
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0
                ]
              },
              {
                "label": "LaTrobe Membership (Amy)",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Other entertainment",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              }
            ]
          },
          {
            "name": "Accounting & Legal",
            "lines": [
              {
                "label": "Accounting fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "Legal fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "ASIC fees",
                "months": [
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0
                ]
              }
            ]
          },
          {
            "name": "Telephone & Internet",
            "lines": [
              {
                "label": "Mobile phones",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Internet / NBN",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Office & General",
            "lines": [
              {
                "label": "Office supplies",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              },
              {
                "label": "Cleaning",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Milk / coffee / food",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Electricity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Water",
                "months": [
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0
                ]
              },
              {
                "label": "General / miscellaneous",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Bank & Finance",
            "lines": [
              {
                "label": "Bank fees",
                "months": [
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0
                ]
              },
              {
                "label": "Interest expense",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "International transfer fees",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "Travel",
            "lines": [
              {
                "label": "Domestic flights & accommodation",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "International travel",
                "months": [
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0,
                  1500.0
                ]
              },
              {
                "label": "Staff reimbursements",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "haavn": {
    "sections": [
      {
        "name": "Revenue",
        "groups": [
          {
            "name": "Revenue",
            "lines": [
              {
                "label": "Supply Contract 1 \u2014 value",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Supply Contract 2 \u2014 value",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Supply Contract 3 \u2014 value",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Supply Contract 4 \u2014 value",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Working Capital Injection",
                "months": [
                  300000.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Cost of Sales",
        "groups": [
          {
            "name": "Cost of Units / Materials",
            "lines": [
              {
                "label": "Modular unit procurement",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Raw materials",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Transport & logistics",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Third-party manufacturing",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Other COGS",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Operating Expenses",
        "groups": [
          {
            "name": "Wages & Salaries",
            "lines": [
              {
                "label": "Daniel Sette",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Jamie Baldwin",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Lewis Jin",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "James Winstanley",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              },
              {
                "label": "Admin / Accounts",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              }
            ]
          },
          {
            "name": "Superannuation",
            "lines": [
              {
                "label": "Admin / Accounts super",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Rent & Outgoings",
            "lines": [
              {
                "label": "Office rent",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              },
              {
                "label": "Outgoings / strata",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "Car parking",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Insurance",
            "lines": [
              {
                "label": "Professional indemnity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Public liability",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Business / contents",
                "months": [
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0
                ]
              },
              {
                "label": "Workers compensation",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Motor vehicle insurance",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Motor Vehicles",
            "lines": [
              {
                "label": "Vehicle lease / Defender",
                "months": [
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0,
                  2470.0
                ]
              },
              {
                "label": "Vehicle lease / Range Rover",
                "months": [
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0,
                  3100.0
                ]
              },
              {
                "label": "Vehicle lease / SQ8",
                "months": [
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0,
                  3400.0
                ]
              },
              {
                "label": "Fuel & running costs",
                "months": [
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0
                ]
              },
              {
                "label": "Tolls",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Registration & CTP",
                "months": [
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0,
                  225.0
                ]
              }
            ]
          },
          {
            "name": "IT & Software",
            "lines": [
              {
                "label": "Hardware / equipment",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Other IT costs",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Subscriptions & Services",
            "lines": [
              {
                "label": "Xero subscription",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Claude AI",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Adobe Acrobat",
                "months": [
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0
                ]
              },
              {
                "label": "Office 365 / Technicalities",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Estatemaster",
                "months": [
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0,
                  185.0
                ]
              },
              {
                "label": "Landchecker",
                "months": [
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0
                ]
              },
              {
                "label": "Canva",
                "months": [
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0,
                  75.0
                ]
              },
              {
                "label": "Other subscriptions",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Marketing & BD",
            "lines": [
              {
                "label": "Digital / online marketing",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Print / collateral",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "BD materials",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Events / conferences",
                "months": [
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0,
                  500.0
                ]
              }
            ]
          },
          {
            "name": "Entertainment",
            "lines": [
              {
                "label": "Client dining / restaurants",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "LaTrobe Membership (Daniel)",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "LaTrobe Membership (Jamie)",
                "months": [
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0,
                  310.0
                ]
              },
              {
                "label": "LaTrobe Membership (Amy)",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Other entertainment",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              }
            ]
          },
          {
            "name": "Accounting & Legal",
            "lines": [
              {
                "label": "Accounting fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "Legal fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "ASIC fees",
                "months": [
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0
                ]
              }
            ]
          },
          {
            "name": "Telephone & Internet",
            "lines": [
              {
                "label": "Mobile phones",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Internet / NBN",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Office & General",
            "lines": [
              {
                "label": "Office supplies",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              },
              {
                "label": "Cleaning",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Milk / coffee / food",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Electricity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Water",
                "months": [
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0
                ]
              },
              {
                "label": "General / miscellaneous",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Bank & Finance",
            "lines": [
              {
                "label": "Bank fees",
                "months": [
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0
                ]
              },
              {
                "label": "Interest expense",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "International transfer fees",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "Travel",
            "lines": [
              {
                "label": "Domestic flights & accommodation",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "International travel",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "Staff reimbursements",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  "haavn-mgmt": {
    "sections": [
      {
        "name": "Revenue",
        "groups": [
          {
            "name": "James Maloney",
            "lines": [
              {
                "label": "Heidelberg Childcare",
                "months": [
                  4500.0,
                  4500.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "106 Princess Street Kew",
                "months": [
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Molti Investments \u2014 Armadale",
                "months": [
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0,
                  7500.0
                ]
              },
              {
                "label": "Molti Investments \u2014 Toorak",
                "months": [
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0
                ]
              },
              {
                "label": "Raynor \u2014 Glen Waverley",
                "months": [
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0
                ]
              },
              {
                "label": "Project D",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "John Dimittina",
            "lines": [
              {
                "label": "White Street Mordialloc",
                "months": [
                  4500.0,
                  4500.0,
                  4500.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "56 - 58 Development Trust",
                "months": [
                  4500.0,
                  4500.0,
                  4500.0,
                  4500.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "HG-19 - Peel Stree Kew",
                "months": [
                  5786.0,
                  5786.0,
                  5786.0,
                  5786.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "1542 HSGI - Glen Iris",
                "months": [
                  4500.0,
                  4500.0,
                  4500.0,
                  4500.0,
                  4500.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Propel Byron Bay",
                "months": [
                  1100.0,
                  1100.0,
                  1100.0,
                  1100.0,
                  1100.0,
                  1100.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Midland \u2014 S.Melbourne",
                "months": [
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Hiland",
                "months": [
                  8800.0,
                  8800.0,
                  30000.0,
                  8800.0,
                  8800.0,
                  30000.0,
                  8800.0,
                  8800.0,
                  30000.0,
                  8800.0,
                  8800.0,
                  30000.0
                ]
              },
              {
                "label": "HG16 High Street Windsor",
                "months": [
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0
                ]
              },
              {
                "label": "Young Brunswick",
                "months": [
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0
                ]
              },
              {
                "label": "JT Property - Packington Kew",
                "months": [
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0
                ]
              },
              {
                "label": "Raynor (Split)",
                "months": [
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0,
                  2500.0
                ]
              }
            ]
          },
          {
            "name": "Domenic P",
            "lines": [
              {
                "label": "7even (Preston)",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Project B",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "James W",
            "lines": [
              {
                "label": "Dekas One \u2014 Blackburn",
                "months": [
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0
                ]
              },
              {
                "label": "Project B",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Working Capital",
                "months": [
                  300000.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "POTENTIAL / PIPELINE (not committed)",
            "lines": [
              {
                "label": "Lee Macro Project",
                "months": [
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0,
                  5500.0
                ]
              },
              {
                "label": "Mr Geng \u2014 Nunawading",
                "months": [
                  0.0,
                  0.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0,
                  6000.0
                ]
              },
              {
                "label": "Ray Li",
                "months": [
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0,
                  2000.0
                ]
              },
              {
                "label": "Nolan J \u2014 Lilydale",
                "months": [
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0,
                  3500.0
                ]
              },
              {
                "label": "MRA Development \u2014 Camberwell",
                "months": [
                  0.0,
                  0.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0,
                  3000.0
                ]
              },
              {
                "label": "CSR Monash",
                "months": [
                  0.0,
                  0.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0
                ]
              },
              {
                "label": "Carl Sydney",
                "months": [
                  0.0,
                  0.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0,
                  11000.0
                ]
              },
              {
                "label": "Virgate",
                "months": [
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0,
                  7000.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Cost of Sales",
        "groups": [
          {
            "name": "Direct Delivery Costs",
            "lines": [
              {
                "label": "Consulting Fees",
                "months": [
                  4000.0,
                  4000.0,
                  15000.0,
                  4000.0,
                  4000.0,
                  15000.0,
                  4000.0,
                  4000.0,
                  15000.0,
                  4000.0,
                  4000.0,
                  15000.0
                ]
              },
              {
                "label": "Council & planning fees",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Other direct project costs",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      },
      {
        "name": "Operating Expenses",
        "groups": [
          {
            "name": "Wages & Salaries",
            "lines": [
              {
                "label": "James Winstanley",
                "months": [
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0,
                  20000.0
                ]
              },
              {
                "label": "John Dimattina",
                "months": [
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0,
                  11921.0
                ]
              },
              {
                "label": "James Maloney",
                "months": [
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0,
                  9865.0
                ]
              },
              {
                "label": "Dom Paolilli",
                "months": [
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0,
                  8221.0
                ]
              },
              {
                "label": "Accounts",
                "months": [
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0
                ]
              },
              {
                "label": "Admin",
                "months": [
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0,
                  3737.0
                ]
              }
            ]
          },
          {
            "name": "Superannuation",
            "lines": [
              {
                "label": "John Dimattina",
                "months": [
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0,
                  1371.0
                ]
              },
              {
                "label": "James Maloney",
                "months": [
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0,
                  1135.0
                ]
              },
              {
                "label": "Dom Paolilli",
                "months": [
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0,
                  945.0
                ]
              },
              {
                "label": "Accounts",
                "months": [
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0
                ]
              },
              {
                "label": "Admin",
                "months": [
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0,
                  430.0
                ]
              }
            ]
          },
          {
            "name": "Rent & Outgoings",
            "lines": [
              {
                "label": "Office rent",
                "months": [
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0,
                  5000.0
                ]
              },
              {
                "label": "Outgoings / strata",
                "months": [
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0,
                  1000.0
                ]
              },
              {
                "label": "Car parking",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Insurance",
            "lines": [
              {
                "label": "Professional indemnity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Public liability",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Business / contents",
                "months": [
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0,
                  200.0
                ]
              },
              {
                "label": "Workers compensation",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Motor vehicle insurance",
                "months": [
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0,
                  600.0
                ]
              }
            ]
          },
          {
            "name": "Motor Vehicles",
            "lines": [
              {
                "label": "Vehicle lease / Tiguan",
                "months": [
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0,
                  750.0
                ]
              },
              {
                "label": "Vehicle lease / Carnival",
                "months": [
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0,
                  1750.0
                ]
              },
              {
                "label": "Vehicle lease / Defender",
                "months": [
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0,
                  2100.0
                ]
              },
              {
                "label": "Fuel & running costs",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Tolls",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Registration & CTP",
                "months": [
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0,
                  80.0
                ]
              }
            ]
          },
          {
            "name": "IT & Software",
            "lines": [
              {
                "label": "Hardware / equipment",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Other IT costs",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Subscriptions & Services",
            "lines": [
              {
                "label": "Xero subscription",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Claude AI",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Adobe Acrobat",
                "months": [
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0,
                  130.0
                ]
              },
              {
                "label": "Office 365 / Technicalities",
                "months": [
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0,
                  120.0
                ]
              },
              {
                "label": "Other subscriptions",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Marketing & BD",
            "lines": [
              {
                "label": "Digital / online marketing",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Print / collateral",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "BD materials",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Events / conferences",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "Entertainment",
            "lines": [
              {
                "label": "Client dining / restaurants",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              },
              {
                "label": "Other entertainment",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Accounting & Legal",
            "lines": [
              {
                "label": "Accounting fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "Legal fees",
                "months": [
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0,
                  350.0
                ]
              },
              {
                "label": "ASIC fees",
                "months": [
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0,
                  40.0
                ]
              }
            ]
          },
          {
            "name": "Telephone & Internet",
            "lines": [
              {
                "label": "Mobile phones",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Internet / NBN",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              }
            ]
          },
          {
            "name": "Office & General",
            "lines": [
              {
                "label": "Office supplies",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              },
              {
                "label": "Cleaning",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Milk / coffee / food",
                "months": [
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0,
                  150.0
                ]
              },
              {
                "label": "Electricity",
                "months": [
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0,
                  250.0
                ]
              },
              {
                "label": "Water",
                "months": [
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0,
                  50.0
                ]
              },
              {
                "label": "General / miscellaneous",
                "months": [
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0,
                  100.0
                ]
              }
            ]
          },
          {
            "name": "Bank & Finance",
            "lines": [
              {
                "label": "Bank fees",
                "months": [
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0,
                  10.0
                ]
              },
              {
                "label": "Interest expense",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "International transfer fees",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          },
          {
            "name": "Travel",
            "lines": [
              {
                "label": "Domestic flights & accommodation",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "International travel",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              },
              {
                "label": "Staff reimbursements",
                "months": [
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0,
                  0.0
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
