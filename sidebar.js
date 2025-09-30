
(function() {
  const ADMIN_PASSWORD = "Fishing101!";
  const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";
  const PARK_DATA_KEY = "parkData";

  // Zones defined as newline-separated strings -> arrays (avoids comma/quote errors)
  const zoneStrings = {
    "Zone 1": `M0123
M0427
M0402
M0136
M0364
M0408
M0819
M0105
M0359
M0361
M0362
M0363
M1677
M0392
M0436
M0110
M0147
M0367
M0374
M0163
M0140
M1361
M0390
M0389
M0130
M0103
M0350
M0120
M0114
M0104
M0131
M0388
M0394
M0356
M01360
M0358
M0369
M0133
M0385
M0370
M0368
M0432
M0355
M0139
M0122
M0143
M0111
M0157
M0424
M0165
M0815
M0354
M0875
M0375
M0338
M0137
M0149
M0366
M0794
M0113
M0118
M0138
M0380
M0398
M0132
M0342
M0116
M0135
M0774
M0134
M0391
M0405
M0145
M0112
M0146
M1680
M0337
M0160
M0334
M0352
M0154
M0412
M0333
M0809
M0386
M0162
M0343
M0407
M0127
M0119
M0428
M0430
M0429
M1698
M1507
M0109
M0141
M0820
M0117
M0159
M0346
M0144
M0121
M0372
M0128
M0376
M0377
M0340
M0032
M0434
M0360
M0108
M0379
M1544
M0152
M0151
M0397
M0126
M0808
M0371
M0156
M0335
M0400
M0423
M0155
M0124
M0125
M0038
M0349
M0373
M0365
M0142
M0403
M0158
M0129
M0351
M0150
M0153
M0148
M0161
M0401`,
    "Zone 2": `M0504
M0442
M0170
M0480
M0167
M0513
M0439
M0440
M0514
M0180
M0200
M0447
M0202
M0493
M0526
M0183
M0201
M0166
M0184
M0206
M0187
M0812
M0043
M0470
M0172
M0171
M0199
M0179
M0196
M0463
M0538
M0054
M0175
M0197
M0518
M0516
M0168
M0534
M0438
M0173
M0178
M0204
M0181
M0203
M0792
M0186
M0814
M0521
M0498
M0198
M0205
M0797
M0515
M0188
M0169
M0189
M0483
M0484
M0174
M0448
M0185
M0490
M0193
M0527
M0485
M0524
M0190
M0194
M0177
M0182
M0195
M0492
M0530
M0326
M0191
M0488
M0476
M1543
M0452
M0192
M0044
M0176`,
    "Zone 3": `M0221
M0250
M0559
M0606
M0218
M0219
M0067
M0552
M0553
M0603
M0217
M0784
M0593
M0246
M0563
M0562
M0605
M0567
M0251
M0598
M0225
M0579
M0543
M0232
M0207
M0208
M0568
M0570
M0602
M0588
M0549
M0230
M0578
M0231
M0214
M0600
M0237
M0238
M0235
M0229
M0236
M0248
M0212
M0226
M0209
M0222
M0227
M0241
M0213
M0242
M0243
M0211
M0224
M0575
M0584
M0234
M0233
M0216
M0569
M0215
M0065
M0583
M0557
M0545
M1515
M0210
M0604
M0565
M0554
M1687
M0574
M0550
M0247
M0779
M0239
M0564
M0587
M0777
M0228
M0830
M0682
M0555
M0240
M0544
M0585
M0572
M0245
M0591
M0590
M0223
M0780
M0220
M0858
M0252
M0796`,
    "Zone 4": `M0710
M0700
M0677
M0297
M0301
M0702
M0647
M0723
M0626
M0739
M1358
M0740
M0741
M0674
M0610
M0733
M0722
M0621
M0253
M0616
M0270
M0086
M0709
M0746
M0660
M0716
M0315
M0283
M0282
M0689
M0666
M0638
M1679
M0261
M0823
M2021
M0699
M0302
M0634
M0734
M0274
M0316
M0259
M0627
M0299
M0269
M0665
M0305
M0742
M0313
M0314
M0087
M1668
M0825
M1684
M0869
M0284
M1682
M0300
M0276
M0684
M0728
M0306
M0727
M0641
M0717
M0265
M0266
M0078
M0748
M0697
M0257
M0413
M0320
M0636
M0653
M0622
M0264
M0640
M0608
M0612
M0688
M0752
M0680
M0288
M0310
M0318
M0319
M0655
M0729
M0617
M0725
M0671
M0275
M0663
M0731
M0718
M0296
M0291
M0311
M0729
M0619
M0312
M0705
M0503
M0631
M0304
M0415
M0262
M0645
M0793
M0414
M0268
M0625
M0607
M0290
M0736
M0260
M0735
M1021
M0661
M0307
M0309
M0308
M0286
M0293
M0263
M0694
M0693
M0272
M0696
M0781
M0692
M0285
M0695
M0279
M0082
M0295
M0294
M0737
M0658
M0685
M0280
M0657
M0656
M0271
M0267
M0019
M0298
M0730
M0667
M0289
M0618
M0670
M0681
M0092
M0084
M0085
M0258
M0642
M0281
M1688
M0278
M0744
M0303
M0726
M0255
M0317
M0256
M0789
M1673
M1660
M0785
M0650
M0273
M0817
M0750
M0724
M0679`,
    "Zone 5": `M0766
M0790
M0791
M0321
M0803
M0331
M0332
M0329
M0330
M0756
M0758
M0322
M1676
M0764
M0324
M0323
M0760
M0328
M0325
M0327
M0762
M0753`
  };

  // Convert to arrays
  const zones = Object.fromEntries(Object.entries(zoneStrings).map(([k,v]) => [k, v.trim().split(/\s+/)]));

  // Storage
  let parkData = JSON.parse(localStorage.getItem(PARK_DATA_KEY) || "{}");
  let nameIndex = {}; // MowingID -> Name

  function saveData() {
    localStorage.setItem(PARK_DATA_KEY, JSON.stringify(parkData));
  }

  // Extract a field either from direct property or from description HTML table
  function extractField(props, field) {
    if (!props) return "";
    const direct = props[field] || props[field.toLowerCase()] || props[field.toUpperCase()];
    if (direct) return direct;
    let desc = props.description;
    if (desc && typeof desc === "object" && desc.value) desc = desc.value;
    if (typeof desc === "string") {
      const rx = new RegExp("<td>"+field+"</td><td>(.*?)</td>", "i");
      const m = rx.exec(desc);
      if (m) return m[1].trim();
    }
    return "";
  }

  // Build index from all GeoJSON layers on the map
  function buildNameIndex() {
    if (!window.map || typeof map.eachLayer !== "function") return;
    map.eachLayer(function(layer) {
      if (layer && typeof layer.eachLayer === "function") {
        try {
          layer.eachLayer(function(fl) {
            const f = fl.feature;
            if (f && f.properties) {
              const id = extractField(f.properties, "MowingID") || extractField(f.properties, "UniqueID") || f.properties.ID;
              const nm = extractField(f.properties, "Name") || f.properties.name || "";
              if (id) nameIndex[id] = nm || "";
            }
          });
        } catch(e) { /* non-geojson layers */ }
      }
    });
  }

  function renderSidebar() {
    const sidebar = document.getElementById("sidebar-content");
    if (!sidebar) return;
    sidebar.innerHTML = "";
    Object.keys(zones).forEach(zone => {
      const zoneDiv = document.createElement("div");
      zoneDiv.className = "zone";
      const header = document.createElement("h3");
      header.innerText = zone;
      const list = document.createElement("div");
      list.classList.add("hidden"); // collapsed by default
      header.onclick = () => list.classList.toggle("hidden");
      zoneDiv.appendChild(header);

      zones[zone].forEach((parkId, idx) => {
        const item = document.createElement("div");
        item.className = "park-item";

        const label = document.createElement("span");
        const nm = nameIndex[parkId] ? " - " + nameIndex[parkId] : "";
        label.className = "park-label";
        label.innerText = (idx + 1) + ". " + parkId + nm;
        label.onclick = () => zoomToPark(parkId);

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "6px";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = parkData[parkId]?.done || false;
        checkbox.onchange = () => {
          parkData[parkId] = parkData[parkId] || {};
          parkData[parkId].done = checkbox.checked;
          parkData[parkId].time = new Date().toISOString();
          saveData();
        };

        row.appendChild(checkbox);
        row.appendChild(label);

        const note = document.createElement("input");
        note.type = "text";
        note.value = parkData[parkId]?.note || "";
        note.placeholder = "Notes...";
        note.onchange = () => {
          parkData[parkId] = parkData[parkId] || {};
          parkData[parkId].note = note.value;
          saveData();
        };

        item.appendChild(row);
        item.appendChild(note);
        list.appendChild(item);
      });

      zoneDiv.appendChild(list);
      sidebar.appendChild(zoneDiv);
    });
  }

  function zoomToPark(parkId) {
    if (!window.map) return;
    let done = false;
    map.eachLayer(function(layer) {
      if (done) return;
      if (layer && typeof layer.eachLayer === "function") {
        try {
          layer.eachLayer(function(fl) {
            if (done) return;
            const f = fl.feature;
            if (f && f.properties) {
              const id = extractField(f.properties, "MowingID") || extractField(f.properties, "UniqueID") || f.properties.ID;
              if (id === parkId) {
                if (typeof fl.getBounds === "function") {
                  map.fitBounds(fl.getBounds());
                } else if (typeof fl.getLatLng === "function") {
                  map.setView(fl.getLatLng(), 18);
                }
                done = true;
              }
            }
          });
        } catch(e) {}
      }
    });
  }

  // Admin login (kept to avoid breaking the existing button)
  window.adminLogin = function() {
    const pwd = prompt("Enter admin password:");
    if (pwd === ADMIN_PASSWORD) {
      const tools = document.getElementById("admin-tools");
      if (tools) tools.style.display = "block";
    } else {
      alert("Wrong password!");
    }
  };

  // Collapsible state persistence
  window.toggleSidebar = function() {
    const sb = document.getElementById("sidebar");
    sb.classList.toggle("collapsed");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sb.classList.contains("collapsed"));
  };

  window.addEventListener("load", function() {
    const sb = document.getElementById("sidebar");
    if (sb && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") sb.classList.add("collapsed");
    // Build name index after map + layers load
    setTimeout(() => {
      buildNameIndex();
      renderSidebar();
    }, 1200);
  });
})();
