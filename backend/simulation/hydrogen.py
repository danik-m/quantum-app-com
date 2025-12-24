import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.special import genlaguerre, factorial, sph_harm
from scipy import constants
import io
import base64

# Constants
A0 = constants.physical_constants['Bohr radius'][0]  # m
EV = constants.electron_volt

plt.style.use('dark_background')


def radial_wavefunction(r, n, l, Z):
    """
    Radial wavefunction R_{nl}(r) for hydrogen-like atom (in SI units), returns array
    r: array of radii (m)
    n, l: quantum numbers
    Z: nuclear charge
    """
    # avoid invalid combos
    if n <= 0 or l < 0 or l >= n:
        return np.zeros_like(r)

    rho = (2.0 * Z * r) / (n * A0)

    # normalization prefactor (analytic for hydrogenic)
    # factorial may be large; use floats
    prefactor = np.sqrt((2.0 * Z / (n * A0))**3 * (factorial(n - l - 1) / (2.0 * n * factorial(n + l))))

    # associated Laguerre polynomial L_{n-l-1}^{2l+1}(rho)
    L = genlaguerre(n - l - 1, 2 * l + 1)(rho)

    R = prefactor * np.exp(-rho / 2.0) * (rho**l) * L
    return R


def get_hydrogen_solution(Z, n, l, m=0):
    """
    Compute hydrogen-like solutions and produce two images:
      - radial plot (R_nl and P(r) = r^2 |R|^2)
      - 2D heatmap of |psi_{n l m}(x,y,z=0)|^2 in the plane z=0

    Returns dict with keys: energy (eV), avg_radius_a0, radial_png_bytes, heatmap_png_bytes, theory (string)
    """
    # Input validation and sanitization
    n = int(n)
    l = int(l)
    m = int(m)
    Z = int(Z)

    if n < 1:
        return {"error": "n must be >= 1"}
    if l < 0 or l >= n:
        return {"error": "l must satisfy 0 <= l <= n-1"}
    if abs(m) > l:
        return {"error": "m must satisfy -l <= m <= l"}

    # 1) Energy
    E_ev = -13.605693122994 * (Z**2) / (n**2)

    # 2) Average radius (in meters)
    avg_r = (A0 * n**2 / Z) * (1.5 - (l * (l + 1)) / (2 * n**2))

    # 3) Radial plot
    # choose r grid up to a few times n^2 a0 / Z
    r_max = (A0 * n**2 / Z) * 4.0
    if l > n / 2:
        r_max *= 1.2
    r = np.linspace(0, r_max, 1200)

    R_nl = radial_wavefunction(r, n, l, Z)
    P_r = (r**2) * (np.abs(R_nl)**2)

    # prepare radial figure
    fig1, ax1 = plt.subplots(figsize=(10, 6))
    fig1.patch.set_facecolor('#0E1117')
    ax1.set_facecolor('#0E1117')

    R_vis = R_nl / (np.max(np.abs(R_nl)) + 1e-30)
    P_vis = P_r / (np.max(P_r) + 1e-30)

    ax1.plot(r / A0, R_vis, color='cyan', label=f'$R_{{{n}{l}}}(r)$ (normalized)', lw=2)
    ax1.plot(r / A0, P_vis, color='lime', label=f'$P(r)=r^2|R|^2$ (normalized)', lw=2, linestyle='--')

    ax1.set_xlabel(r"Distance $r$ ($a_0$)", color='white', fontsize=12)
    ax1.set_ylabel("Amplitude / Probability", color='white', fontsize=12)
    ax1.set_title(f"Hydrogen-like Atom (Z={Z}): n={n}, l={l}, m={m}", color='white', fontsize=14)

    ax1.legend(loc='upper right', facecolor='#0E1117', labelcolor='white')
    ax1.grid(True, linestyle=':', alpha=0.3, color='gray')
    ax1.tick_params(colors='white')
    for spine in ax1.spines.values():
        spine.set_color('#444')

    buf1 = io.BytesIO()
    plt.savefig(buf1, format='png', dpi=120, bbox_inches='tight')
    plt.close(fig1)
    buf1.seek(0)
    radial_png = buf1.read()

    # 4) 2D heatmap of |psi|^2 in plane z=0
    # grid in Cartesian coordinates (x,y) centered at origin
    grid_size = 300
    extent_a0 = max(6.0 * n**2 / Z, 6.0)  # in units of a0
    extent_m = extent_a0 * A0
    xs = np.linspace(-extent_m, extent_m, grid_size)
    ys = np.linspace(-extent_m, extent_m, grid_size)
    X, Y = np.meshgrid(xs, ys)
    Rgrid = np.sqrt(X**2 + Y**2)

    # polar angles: theta (polar) = pi/2 for z=0, phi (azimuth) = atan2(y,x)
    theta_grid = np.full_like(Rgrid, np.pi / 2.0)
    phi_grid = np.arctan2(Y, X)

    # radial values and R_nl at each radius (interpolate radial array)
    R_interp = np.interp(Rgrid.flatten(), r, R_nl, left=0.0, right=0.0)
    R_interp = R_interp.reshape(Rgrid.shape)

    # spherical harmonic Y_lm(phi, theta) using scipy: sph_harm(m, l, phi, theta)
    # note: sph_harm expects (m, l, phi, theta) where phi=azimuthal, theta=polar
    Y_lm = sph_harm(m, l, phi_grid, theta_grid)

    # total wavefunction psi(r,theta,phi) = R_nl(r) * Y_lm(theta,phi)
    psi_grid = R_interp * Y_lm
    prob_density = np.abs(psi_grid)**2

    # Avoid showing extremely small numbers; use log scale for visibility
    prob_display = prob_density
    # add small floor to avoid zeros in log
    with np.errstate(divide='ignore'):
        prob_log = np.log10(prob_display + 1e-50)

    fig2, ax2 = plt.subplots(figsize=(6, 6))
    fig2.patch.set_facecolor('#0E1117')
    ax2.set_facecolor('#0E1117')

    im = ax2.imshow(prob_log, origin='lower', extent=[-extent_a0, extent_a0, -extent_a0, extent_a0], cmap='plasma')
    ax2.set_xlabel(r'$x$ ($a_0$)', color='white')
    ax2.set_ylabel(r'$y$ ($a_0$)', color='white')
    ax2.set_title(f'$|\psi_{{{n}{l}{m}}}(x,y,z=0)|^2$ (log10)', color='white')
    ax2.tick_params(colors='white')
    for spine in ax2.spines.values():
        spine.set_color('#444')

    cbar = fig2.colorbar(im, ax=ax2, fraction=0.046, pad=0.04)
    cbar.ax.yaxis.set_tick_params(color='white')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')

    buf2 = io.BytesIO()
    plt.savefig(buf2, format='png', dpi=120, bbox_inches='tight')
    plt.close(fig2)
    buf2.seek(0)
    heatmap_png = buf2.read()

    radial_b64 = base64.b64encode(radial_png).decode('utf-8')
    heatmap_b64 = base64.b64encode(heatmap_png).decode('utf-8')

    theory_text = (
        "Analytic hydrogen-like stationary solution: separation of variables -> "
        "R_{nl}(r) from associated Laguerre polynomials and spherical harmonics Y_{lm}(theta,phi). "
        "Energy E_n = -13.605693 eV * Z^2 / n^2. Radial nodes = n - l - 1. "
        "Returned radial plot and a 2D slice of |psi|^2 in the z=0 plane (log10 scale for visibility)."
    )

    return {
        "energy": float(E_ev),
        "avg_radius_a0": float(avg_r / A0),
        "radial_png": radial_b64,
        "heatmap_png": heatmap_b64,
        "theory": theory_text
    }