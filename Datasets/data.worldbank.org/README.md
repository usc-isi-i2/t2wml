# World Development Indicators

This dataset comes from https://databank.worldbank.org/source/world-development-indicators/Type. The specific indicators are of interest to country models developed by our collaborators:

```
http://api.worldbank.org/v2/en/indicator/NY.GDP.PCAP.CN?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/DT.ODA.ODAT.GI.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/EG.ELC.ACCS.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/FP.CPI.TOTL?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/SN.ITK.DEFC.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/MS.MIL.XPND.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/SL.EMP.TOTL.SP.NE.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/MS.MIL.XPND.GD.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/SH.H2O.BASW.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/SH.STA.BASS.ZS?downloadformat=excel
http://api.worldbank.org/v2/en/indicator/SH.DYN.MORT?downloadformat=excel
```

Files:

- `wikifier.csv`: mapping of strings to qnodes.
- `new_items_properties`: new items and properties needed to model the data.
- `table_model.yaml`: the mapping file to convert the Excel sheets to Wikidata RDF
