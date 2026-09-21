<?xml version='1.0' encoding='utf-8'?>
<tileset version="1.11" tiledversion="1.11.2" name="walk-tileset" tilewidth="32" tileheight="32" tilecount="32" columns="8">
  <image source="walk-tileset.png" width="256" height="128" />
  <tile id="0" type="terrain">
    <properties>
      <property name="key" value="grass_base" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Grama base repetível" />
    </properties>
  </tile>
  <tile id="1" type="terrain">
    <properties>
      <property name="key" value="grass_variant" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Variação discreta da grama" />
    </properties>
  </tile>
  <tile id="2" type="terrain">
    <properties>
      <property name="key" value="stone_path" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Caminho de pedras base" />
    </properties>
  </tile>
  <tile id="3" type="terrain">
    <properties>
      <property name="key" value="stone_path_variant" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Variação do caminho de pedras" />
    </properties>
  </tile>
  <tile id="4" type="terrain">
    <properties>
      <property name="key" value="dirt" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Terra base" />
    </properties>
  </tile>
  <tile id="5" type="terrain">
    <properties>
      <property name="key" value="water" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Água base" />
    </properties>
  </tile>
  <tile id="6" type="grass_path_transition">
    <properties>
      <property name="key" value="path_edge_n" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Grama ao norte" />
    </properties>
  </tile>
  <tile id="7" type="grass_path_transition">
    <properties>
      <property name="key" value="path_edge_e" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Grama ao leste" />
    </properties>
  </tile>
  <tile id="8" type="grass_path_transition">
    <properties>
      <property name="key" value="path_edge_s" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Grama ao sul" />
    </properties>
  </tile>
  <tile id="9" type="grass_path_transition">
    <properties>
      <property name="key" value="path_edge_w" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Grama ao oeste" />
    </properties>
  </tile>
  <tile id="10" type="grass_path_transition">
    <properties>
      <property name="key" value="path_outer_nw" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto externo noroeste" />
    </properties>
  </tile>
  <tile id="11" type="grass_path_transition">
    <properties>
      <property name="key" value="path_outer_ne" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto externo nordeste" />
    </properties>
  </tile>
  <tile id="12" type="grass_path_transition">
    <properties>
      <property name="key" value="path_outer_se" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto externo sudeste" />
    </properties>
  </tile>
  <tile id="13" type="grass_path_transition">
    <properties>
      <property name="key" value="path_outer_sw" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto externo sudoeste" />
    </properties>
  </tile>
  <tile id="14" type="grass_path_transition">
    <properties>
      <property name="key" value="path_inner_nw" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto interno noroeste" />
    </properties>
  </tile>
  <tile id="15" type="grass_path_transition">
    <properties>
      <property name="key" value="path_inner_ne" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto interno nordeste" />
    </properties>
  </tile>
  <tile id="16" type="grass_path_transition">
    <properties>
      <property name="key" value="path_inner_se" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto interno sudeste" />
    </properties>
  </tile>
  <tile id="17" type="grass_path_transition">
    <properties>
      <property name="key" value="path_inner_sw" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Canto interno sudoeste" />
    </properties>
  </tile>
  <tile id="18" type="decoration">
    <properties>
      <property name="key" value="flowers" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Flores sobre terreno" />
    </properties>
  </tile>
  <tile id="19" type="decoration">
    <properties>
      <property name="key" value="bush" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Arbusto sobre terreno" />
    </properties>
  </tile>
  <tile id="20" type="fence">
    <properties>
      <property name="key" value="fence_horizontal" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Trecho horizontal" />
    </properties>
  </tile>
  <tile id="21" type="fence">
    <properties>
      <property name="key" value="fence_vertical" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Trecho vertical" />
    </properties>
  </tile>
  <tile id="22" type="fence">
    <properties>
      <property name="key" value="fence_corner_nw" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Canto com saídas leste e sul" />
    </properties>
  </tile>
  <tile id="23" type="fence">
    <properties>
      <property name="key" value="fence_corner_ne" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Canto com saídas oeste e sul" />
    </properties>
  </tile>
  <tile id="24" type="fence">
    <properties>
      <property name="key" value="fence_corner_se" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Canto com saídas oeste e norte" />
    </properties>
  </tile>
  <tile id="25" type="fence">
    <properties>
      <property name="key" value="fence_corner_sw" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Canto com saídas leste e norte" />
    </properties>
  </tile>
  <tile id="26" type="fence">
    <properties>
      <property name="key" value="fence_end_w" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Final oeste; segmento segue a leste" />
    </properties>
  </tile>
  <tile id="27" type="fence">
    <properties>
      <property name="key" value="fence_end_e" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Final leste; segmento segue a oeste" />
    </properties>
  </tile>
  <tile id="28" type="fence">
    <properties>
      <property name="key" value="fence_end_n" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Final norte; segmento segue ao sul" />
    </properties>
  </tile>
  <tile id="29" type="fence">
    <properties>
      <property name="key" value="fence_end_s" />
      <property name="alpha" value="overlay" />
      <property name="description" value="Final sul; segmento segue ao norte" />
    </properties>
  </tile>
  <tile id="30" type="transition">
    <properties>
      <property name="key" value="steps" />
      <property name="alpha" value="opaque" />
      <property name="description" value="Degraus sobre caminho de pedras" />
    </properties>
  </tile>
  <tile id="31" type="utility">
    <properties>
      <property name="key" value="empty" />
      <property name="alpha" value="empty" />
      <property name="description" value="Tile transparente intencional" />
    </properties>
  </tile>
</tileset>