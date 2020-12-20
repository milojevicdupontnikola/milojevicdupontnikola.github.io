---
layout: page
title: /pub-building-heights
permalink: /pub-building-heights
---

# Learning from urban form to predict building heights

_Milojevic-Dupont,N., Hans, N., Kaack, L. H., Zumwald, M, Andrieux, F., de Barros Soares, D., Lohrey, S., Pichler, P.P. & Creutzig, F. (2020) PLoS ONE 15(12): e0242010_

<img src="data-project-pic.png" alt="image" width="600"/>

[paper](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0242010) (open access)
[code](https://gitlab.pik-potsdam.de/nikolami/learning-from-urban-form-to-predict-building-heights)

Accelerating sustainable urban planning requires more granular and consistent data on cities' built-up infrastructure. This study proposed a method to predict building heights at scale with machine learning & using only open data as input. 

Open building height data are very useful for designing more sustainable cities, but their availability remains limited to few regions. For example, the height of buildings matters for the analysis of building energy use or urban heat island effects, where 2D maps are not enough. The hypothesis behind the method is that the urban form around a building contains predictive information about the building characteristics. We built a large set of features using domain knowledge from urban studies to describe the morphology of neighborhoods and cities. We then trained ML algorithms to learn how building heights from existing 3D models relate to urban form information. This study extended a similar approach first developed by Filip Biljecki by adding more urban context and using larger & more distant areas.

Would this method perform well across countries, so that it enables to predict building heights in new countries for which no training data would be available? We investigated this by using data from 4 different European countries, training on 3 and holding 1 out for testing. We found that the model manages to predict well on average building heights in Berlin and Brandenburg (Germany), with training data from the Netherlands, France and Italy. In this set-up, we got about 60-80% of the predictions within the range of the typical height of a floor (2.5 m). But in reality, there are often some scarce local data available, e.g. from OpenStreetMap. We tested this as well. The results were exciting: adding just 2% of local data boosts the performance, in particular in Berlin where tall buildings were much more accurately predicted.

We are currently working on extending this proof-of-concept and trying to fill data gaps by predicting for larger areas. 

