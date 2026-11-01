export function codFixture(
  mode = "mw4",
  {
    warning = mode === "dmz",
    damage = mode === "mw4",
    chest = 25,
    second = false,
    noise = "",
    updated = 1793216216044,
  } = {},
) {
  const body = `{game:"${mode}",sourceGame:"mw4",gun:"Han 86",updated:${updated},ads:250,rpm:741,hip_strafe_accuracy:-1.9,autoLoadouts:$R[3]={enabled:!0},simple_damage:$R[4]=[${damage ? `$R[5]={dropoff:0,chest:${chest},head:30,ttk:324,shots_to_kill:5}` : ""}]}`;
  return `<h1>${mode === "mw4" ? "Modern Warfare 4 Stats Comparator: MW4 multiplayer" : "DMZ Stats Comparator: DMZ"}</h1><p>Updated:30/10/2026 ${warning ? "NOT TESTED YET IN GAME." : ""}</p><script>x={weaponStats:$R[1]=[$R[2]=${body}${second ? `,{game:"${mode}",sourceGame:"mw4",gun:"M4",rpm:811,simple_damage:[]}` : ""}]};</script><footer>${noise}</footer>`;
}
