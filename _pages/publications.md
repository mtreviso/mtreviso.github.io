---
layout: page
permalink: /publications/
title: publications
description: >
    An up-to-date list is available on 
    <a href="https://scholar.google.com/citations?user=puR_FskAAAAJ" target="_blank" rel="noopener noreferrer"><u>Google Scholar</u></a>.
years: [2022, 2021, 2020, 2019, 2018, 2017]
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->

<span style='color:#2698ba'>&#42;</span> denotes equal contribution.


<div class="publications">
<h1>Papers</h1>
{% for y in page.years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}
</div>


<div class="publications">
<h1>Theses</h1>
{% bibliography -f theses %}
</div>
