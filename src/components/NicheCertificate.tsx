import { useState, useEffect } from "react"
import QRCode from 'qrcode'
import { getOrCreateVerificationUrl } from '../utils/certificateToken'

const NESTARA_SIG = "data:image/png;base64,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"
const LEAD_TRAINER_SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAU8AAADHCAYAAACZWdHzAAAQAElEQVR4Aeyd3Z0st3HFl45AISgD0RFYyoAZkCHYEciOwHIGZgbWm98kZyBlQL/pkRlI87/aWtWtLaDR3WgAPXP427oACoX6OGicwcx+8J/e9J8QEAJCQAjsRkDkuRsyLRACQkAIvL2JPPUUCAEhIAQOINCNPA/E1hIhIASEwG0REHneduuUuBAQAjMREHnORF+xhYAQuC0C65HnbaFU4kJACLwSAiLPV9pt1SoEhEA3BESe3aCUIyEgBF4JgScmz1faRtUqBITAaAREnqMRVzwhIASeAgGR51Nso4oQAkJgNAIiz23EZSEEhIAQ+ISAyPMTJFIIASEgBLYREHluYyQLISAEhMAnBESenyC5TiHPQkAIPA8CIs/n2UtVIgSEwEAERJ4DwVYoISAEngcBkecd91I5CwEhMB0Bkef0LVACQkAI3BEBkecdd005CwEhMB0Bkef0LdiVwK93WW8ay0AICIGjCIg8jyI3Zt2/P8Igf320yB/eW+uLTB+A6EsIzEBA5DkD9e2YkCKk+duHKfJoPn1hY2RKy/iTkRRCQAhcg4DI8xpcz3iFBCHDEmlmvm0N6+hnNlfq5FsIvBwCIs+1thzigwCPZmXrubUe9aF1QkAINCAg8mwAaaDJnttmLS38iEBrCGlOCJxEQOR5EsCOyyE7bo41l//xmPTyx8cYeTSfviBQbrFbPj8tnKlQbCFwFwREnmvsFAQH2WXZQJa/eUx88xAI1gt6BJvH9Kevmt9PxlIIASHQjoDIsx2rKy1rxAlZlm6XlhM2kGhmB4Eyb7ZqhYAQ6ICAyLMDiCddQG5IdAMR7iE97CFQJPqCnPf4iuvvN1bGQuBiBESeFwPc4B5iy8xKb8UzW6+DRLO1xBGBeqTUFwInEBB5ngCv09Ls1olrSJD2iECSJQI94k9rhIAQCAiIPAMgg4dXEKeVUCJQ9GajdhMBGQiBHAGR59sbZMLvipvw4z1vg/7jrXQWKrs1ZnZbOmqLvoiJfmut5oWAEKgg8Ork+esHNpDJo/n4QjeKQIn1Efi9w9t15H14uoEoo79Y8+kgciAEXg2BVyfPEolAasiVz0PJf7wp9sjh/xInkGqiluoiBOT2yRB4dfKsbWeJ3Gpr9syViDveEvf4LNlClJGUS/FLPqQXAkLAISDydGCE7hUkFkJ8Gl4ZEwKNATNdtNFYCAiBBAGRZwLKABW3WiSGQmffuKLls1duiEi0PTLW7fMIaoutUTprICDynLMP3zeGhUy5HSKQKST6L41rMzP8RH2mizYaCwEhEBAQeQZABgy5Tf5wMA5Ex1t7SPSgizfdPo8ip3VCwCHw6uTJzc7BcXmX22OPmJAovo6QKGtjoZku2mj8bAionlMIvDp51sDjhleb3zt3hOi2YkB6kOjet/Lx9rkVR/NCQAgEBESeAZCLhhAnRFdy//NjgnlupSaMWwkcO2I83DR9Ye8N96z169QXAi+LgMhzzNZDhLVIf3pMchvkh9lNGPPn5eyPID9Mql/EaCXBSJ44Zj2tRAjsROA1zUWe1+97C6FBlLVMmG8hUQiwJR6x8Elr0rrO7NUKgZdGQOSZb392M8st+2hb40F4WyTaSqDYxewzXbTRWAgIgQcCIs8HCBd/bRFSK3H6NCFRPhv1Ot8nZstNEj9+nfpCYCYCt4q9GnnyXWN+DtKE7yQjjCED5E4AX5kvn43WbqGtBOrxvDJfH0d9IXB7BFYhTyNNbmHcqEwMYMaQAQKZcsgRm79L+1OS6NnbH+vBJXH9hh5s3wr/MR+nwDrqNBYCQiAgsAJ5QoJGmiG94pBDj7C2aLTARCSiXyY5UXui3qWqESj+awTKvA8Wc/Zz6guBWyAwIsnZ5An5QYJHa2Wt3USP+rhy3RYRReI6k0uNQMGp5Ju3/6U56YWAECggMJM8zxKnLwlywJ/XtfRL5NWDUI7k05JzzaZEoJB4KZ+IQcmuFldzQuDlEJhJnhBeT8Dxt/LBv+Lzzgw/CDQSInbgk719z2yxlwgBIVBBYBZ5lkiOg8wh57vIXtAhlVK+TGFT8v3F4EX+4TeTslLBJ9ODu9eX7LyN+kLgpRGYRZ7Z4UTHoefmFDcFHQKhYhfn/Zh5frTJ62b0eavs4171zSIfw/djfObQZS8uPT6mwL9ECLwMAjPIMzu8EB7k2AI8dtjXbCGJ2QRKDrUc422vZntkDkLMcEKXvX33MbI98vPqC4GXR2AfefaBKyMVCHGPd+y3bqHEWZkEILc9NR+xBaeMpCFQ7y+O/Zz6QkAIJAiMJk9uPJCaT+XMwYUcauuZm0Gg1OlrzPoZqWV2Z3VgEH2wBzHHmA82cZ3GQkAIvCMwmjyzAwkBvqdzqGF9RhDmjLkZBGrxafl7nbReIln5uZ59brhgEH1mumijsRAQAgUERpPn+4H9yCaOPyZ2diDQjJjNDXHiTcvmrmhjLr8IQUYRp4UFnxiTHGsvKszberVCQAgEBEaS59XkxQ2rduAh0FD+Sw2z+r0O/F4KEBUrBM4gMJI8M2LjRnQm/7gWAsjiYIe+9Tvw8ZbG+p7Su+6W3MAmq6t2+2zxKxsh8JIIzCRPf+s5Cn62DpKAKLM59K9MFhnmmQ7srn6nQAyJELgtAjPJ80rQINASKaC/mhgg6Vp92Q2wZt9rDlyy2OCR6XvFlR8h8HQIjCJPDmcE7+q3rviHKGNcxiU9c1fLbJLKas90V+Mg/0Lg1giMIs94ExtFIBBoFot8viL0W+/ivuSz2yd4/Cq4QRdUGgoBIWAIjCJPi2dtRmg217vl9+UznyNz8PEhdD+e0c9umt/NSEQxhcBdERhFntlhHYlZ6RaV/bGOkXnNilW6fc7KR3GFwO0QGEWeEZjRty/IIiPw/uQZK/08nnXjjZlkeEQbjYWAECggMII8V/lsEcKeTVyz4/vHgBeUlfLxuakvBJZHYAR5xrfMMw+sbltfP5Iz9+LrTDQSAjdDYAR5RkhmHlhuWzMJlPgRj8J4iLq2F7W5IckpiBBYGYER5BlvnrPxmPn2fTVCgsxXy2n286H4QqAJgRnkucJhnXn7bNqYgUbCYiDYCvU8CIwgzxXRmnXjmvHCsYX/LCy28tK8EFgagRnkyWFdAZTRN64ViXOFfVAOQuCWCFxNnqv8mFK2OZC4CO3vyGQvJD/9fUr/CgEhkCFwNXnGmKuRFQQac2Qcf88b3R6JfzmetXyjinZFAYdIlp++0bdi4spJCMxC4GryvOsB/OHkhvzp5PoZyyPhz/jtqxl1K6YQOITA1eR5KKkFFn37yOHMRw4Z8ax2636U+NVXJE8mz2DAeokQeFoERJ7lrc0+Byxbfz2TkefXFmuNSu8QzmBQrlAzQuAJEBB5ljcRQul18/q5HGbpGTBYOkElJwRmISDyrCN/9Ob1LDdP0On1AoIviRB4GgRenTy3Pofk5rWXPFgTH5Ds88RoM3Ncq/HoC8iAehRCCMxD4NXJswX5VyCPjPANm9qc2agVAi+HwNXkGW92dzyI5Fy7mcWHBvuoY7zHB/ajpJSvj79q7j5H9YXAUASuJs+hxVwY7BVunzX4nr3+Wu2aEwIpAjPI8w63mPhD7tzOWvNutUs3ZIKS2nxY3i0gXqe+EBACAYGryZNf+wshbzH81yTLZ719ZWQfa40Em8AjlRB4LQSuJs+7ognpx9sXBJIRTWuNrG+1HWkX8yr9Dv6Z2kfWMzWWgr8OAiPIMyMhEOYwmjBeTeLti/wyHfq7SiROqyN78Xi22q1WtULgEAIjyDMmxoH97UMJqZr84TFe7QsCiTmRe9TFccmmpI/rR47ZBx/P9sPr1BcCQiBBYAR5ciB9aEgk3mLQrUigMU/qiISD7hkl1s4e8U7hGWtdryZltDwCM8izBAqHszQ3S599/lfL8+jcjPrIFfGxfb3Zzdvbqi8EXhqBEeS5B+AVbzbZzXnFPPfgXLKNtcZxvI2W/EgvBJ4egRHkefcbTEYYma7lYVmJdOPHD5Eos3riTTWzkW4pBJTMVQiMIM89ua94OCH/SCzkmREh+j31zrIlT8TH92/ZTZ+9SGR1m71aIfAyCIwiz0g+JYDjgS7ZjdZnJJLpRufVM162R7xw9IwhX0LgaRAYRZ53BwwSieQC0cdbWBzHulkTdTPGe96yx7qf7UVjBv53jKmcAwKjyDMewJDGx3AVcvlIyHUy0tjKd8W/IE/OiCvtLXvLbvOx7rjW7NQKgZdCYDXyBPyt2xs2M6R0+6zlEslzBeKJt07yb31xwxZZdY/ITSIEhiAwijyHFDMgSHYLqxHJTwNy2hsiEvgWcfKiEWNEH3FeYyFQROBZJkaRZ3YASxiufDCzOjyhxtwjecb5EgZX6bP4tbfslkck2MyP2aoVAi+BwCjyBMx4ANFlsvrBjHXU8o1/FzSrd6QuvmWnFmQrB/8CgW2tZuYlQuDpERhJns8CZiQS6qq9dWfeyx5bv+5sH8JDvJ/sJu3na/1ZddRy0twrITC51pHk2XLDAY54wNGtJBBOrCUj1JVyJpd460QX60CXSVbz6vuU1SGdEOiGwIrk2a24Cx1F0oFIspvYny/MYY9r8kP8GmpAvG5PP/rbs1a2QuD2CIwkzz1gZUS0Z/3Vthnp/K4x6AzSyWK2fKPIlxRv15lPb6++ELgJAsfSHEmevPWLWWYkFG1WHFNLzP3bQqLRbgbpxLfs5IQUUm5Wr/4i11yIDIXAXgRGkmeWW4lI4i0nWztb15JjD4I6W2f2R6b33jrJIXvBKO0f9hIh8NQIjCbPSCZxfCewMzLJ8p9ZI+SG+LzIB/G6o/3o+6gfrRMCt0MgIc/hNWQHeeahzPIpgbLH1nyMrC2+XSeHI7dO1iHxtj2yFuJLhMAyCIwmz0g2dz98sZ5sYzObEZ8Vgi3icyIXxOvO9kfUcjZHrRcC3RGYTZ4UVDrMdziUrW/dqXO09L51kn9WbyRo7CRC4OkRuJI8nx689wLjW9l39UcD4XwMBnUgNMSH40UK8boe/Rinh0/5EALLIzCaPPcQyV0O5Z6a7IG4urYrbp2We3yxuLoWi6tWCCyFwGjyzIrn8GU3IvSZ/Yq6LH+fZ5y/sjbILfonPuJzOtrPXizu8BHL0Xq1TgikCMwgz92HOM18LSWElWUUSSyz6akjXnbr/P0jCHMIudIiD/Whr7iHZ3wdSkCLhMBsBGaQZ6yZg8eBzvRRt+o4u43NyDUjTvL4z8c//LA8gg0t8teHHgF/5DE89MUeHlqoRULgrgjMIM94awG70uG709vBrC5qQ+JcqV5sjwo+kSPrIVSklUgj0R6NeyRXrRECSyCwCnlGcrkGnGu9RkIh2q/45yFZfT1fGIjNTfIR6vQXJIoYkWYOs5t2z3qymNIJgaUQmEGeGQDcXDKCgRQy+yt1GTG0xDu6rsV3yQbcIE3IrmRjevCNYnOlFr8lEsWXX0cufqy+EHhqBGaQZ0YyHLx4GJ8B+B8uLALMIE7aLAz/eeLqywAAEABJREFUC5DfPCaQb95b+l5Mz69sIg+z9AsS5YWsFItFtTnmJULgqRCYQZ4lADPyXPRAlkp4g7De3H/8mTrezpZeMJzpri5EBnGWFv34mPjnh4Ap8ugWv5jHHwKZlkgUAiUmdjizlj5yt70iZ4kQOIzALPLkwPqkOXgZwWAD+dBeIcTt6ffnHc6Oxoa0ILJSKLA9c+PF/xaJYpPt15V7VapXeiEwBYFZ5FkqloNfmruDPiMUiIbce9QG4daIkzilmyNze4S8SyRKDtxCY03ktyeGbIXAbRGYRZ7x0AFg6dbCIWb+rlIiFPR7a4KwamvAFanZ7J0Dfz4njevIn48lvB6dH6svBJ4WgZXIE5A5qLTPJrwwnCW1Fmx63Toj/uSe3UJ/EQxFngEQDZ8XgVnkmSFaOnglfeajhw6i6OHH+4D4Mr+Qqrcr9VnPW+XSPHqIM4vBXC8hD+LU/LXWVPOhOSGwPAKrkWf2mSEg3uVAlsjr7AvAFnH+8QESxPZoLv8iTo1Az9Z6eQEKIAR6IDCLPEskSU0lAmLuzpKRSqaLNUJWURfH2WeS0abnmJxKBNpSU89c5EsITEFgFnlSbCRJO3RRj63N0V9Zstwt36yGTGf21m7dOkcTp+UFgWb1ttRkPtQKgdsiMJM8M9B4e77ygYQYkCz3K3QQVM0vt78Mr9qa+ty+WeJnK9jHTC+dEHgaBFYjT4DN3tKPJCxyiEJ8fkzIhN/3RhftGJfILLPPdPgwqZEQcbbI1fxc1ZJDRqBbdV2Vj/wKgWEIzCRPDl4s1A5dNhdtR42NMC03i7v1dtrsjrbEQ0rrM9Iq2V6ph8B/CgG+C2MNhcDTIbAqeWZA125hmX2LLvNpxA0p1G6YJWLLbs61XLIcsK/9iiWfc1qe2M6W34UEvn17CxoNhcCTITCTPGtQQlxxvkRW0e7smDjcNq++WdbyJIfvCwbcOFciTtL8L/4JUnpRCGYaCoF7IjCTPLMbGqRRQrI2V1pzRA9xtsSCxDL/e4ktxmJMDplvYmYvLJntaF38oyi1m/Po3BRPCHRHYCZ5lorhxpIRa8l+hp63zSUSO0Oe+CwRJ36Zn1FvS8z/CUa8CATVoaEWCYElEZhNnhBCCZg4t9Jh5C1973wgRvxmePBiAmFnc6vo4t8y/eUqiSkPIXAFArPJM6upRkrcSrM1R3W1WDWfrOOGCOFldpH4MxvT4Qs/JeLEbo8/7GfIn5OgvfbLMEpCSCUE5iAwmzwzUuCggAaEQnuV9PAP4UGilrPlyk3R+rTxR3nQecGPH8d+hlO0mT3OcuyBMT7AGIxqP/2wWb8MhEBPBFYkz1p9kaRqtrU5DiSHsWbDN2eQmg1z5MThRuijixL/dFuc1zhHINunrX3LPUkrBDojMJs8s3KMgOLtDVubo39UsgPpfXGD4vNF7BD66LxN1ic3CBSJb1fPkmdL/Cyn2TowiVjMzknxhUAXBGaTZ0aQFGYHrjdpQIa1mwv5RLIkB3Qtt1ByhzAQ+nuFWP+2d9ET29f2al7ZiiwEHgjMJs9HCm8Qxlvjf0dJCfdbxIlNLRfWQ6I1G3wcFcgZ//G71kf9jV5X2htwO5LL0XVHYmmNENiNwArkmSVtB6cXUXGwe9xiyAeCQ+hnuR/VWc3ZD5eT/1G/s9f1zr23v9n4KP5NEViVPA3OjKDsLb3ZtLQ9iNPHIS8IFKGP+PkjfeqCGLJfy+RzVCPXI75HrCH3UhxqK82V9L33rBRnol6h74zACuSZkULtIO7FG/+Zv+zt8V4SxB4C9YLOJOZ69keWor+VxjWCZA/25LrXfo9v2QqBLgisQJ6lQjiMfAMnzmdEGG1szCEs3WB6f2PGCNMTqeVhbfz9b9PT8na9VlupDtauILXc9+a3VWvPWHtzk70Q+ILAyuT5JcHknz0Hp3QIIbg9fpI0mlQQqjfMbrs2D3la/24tL1I+51gnWPNi6G1K/eirZCf9PxBQbwICK5BndrsECjtEkYCYaxFbH235rvZRn9HX1jjW9v9bCyrzo3KupNA89fuH5dF8Sy94D5cfX5Dxx0AdITADgRXIk7qPHjTWliQ7hBBniVRLfnrqyeloreTeM5eevqjL+8tqbMG9xYY4rbdYbCVC4BIEViHPrLjS7aKk9z5Kh7Ckt7XZobe5I20WL/7ptha/fFbaO7eWuC02sUZInlyjvmXfIgnjqyUH2XRCQG7aEViFPONBswq4YXAQbdzaxkPIulkHMeZ/5LPN+Bki9awiGdbkxkcWsXb2k7lMsmeA9Ui0byHiuEZjIdAVgVXIs1QUByo7PCV79Kyh9QJxRn3tIPu1Z/uQiPfxrR809iELpNF8mFnElMCZDj1Sm4skzJ7t3XtiSITAEARWIc9IMFvFjyK+rTy25iGLSApba0rzq5En+cTaIDyfP/X7MWv82PrRDn2mQ29S8mXzamci8AKxVyFPoM5uGUcOSDzQ+N06iKX46I8KvxUUc9njK75VX+0FI9ubiDMviuDv6451sCbi5EnY972fuMbPXd2ndvKmvTqW/C+KwErk2QMiHujohwMcdVePIc4zBwvCiT/Ejz/k6txb/INzJK8SyUV/rDUd9WR+vA1YmP3slrz4g8zsL3nTMqaO2bkp/mAEViLP0iHhgY2w7HlYs/XRX+/xnvxibHDgh/hpET/PgfXjGX1qi3lAnCWco571dvuMfqgn2qOLOKDDD+0oIa8sX+JDoszTl3RFYF1ndyDPPejZobQ12aGzuasOX0+/kJLlS4tvhP4sgShi7BpxcPPP9oE1sZZYr8XBh/V9G9f7ud79EnFaHOapycZqnxyBlcizBHV2QDJdtr506M7aZuuv0EE6iPfNIfXjkf2MOEuE5/OKpPLfj8lYB36i3cPsy1fE4Ivy8U/08VBd8lXKKwYjn1bbuFbjmyGwEnlCdKVD0gprK6m2+jti17sGSMXnMatGSCHGJjf0Pr+Wfva/Ja75KWEa82mJvdeGvCDF1nXYsqbVXnZjEOgeZSXy7F7cRIeQSkv4vxSM/McPGXFkN8CCqy5qyABS8M6oEb3XlfpbL4x8xltaa/oMB+ZGEChx9ghYtWKzx69sF0JgNfJsfeBaD8yeA1eyPbJd1NHi738LzmN9EJU3ZR7xuqv61AIZeP/Uht7rtvole2rD39Z67DKbmFtmc1RHziX/5PxNxTHrWF8xaZpin5EmYxmNQ2A18uSGMq76ayNxm+LAc8gsUqyv9Kua8bBwCL0f/HH7jHboewoxIIHok9qibmtMDdGGzz4zfbRjTP0IfS9ggHhdr35Wu/lmb+lnOaFHWN9aH/Ym1AP2XviRKAR/iNmqHYyAhVuNPMmr9jAyb+Lf2pouruUhtLkZLQ85RMMNBcny2frr8pa3HVYb03I4aa8QDm7MF3ypZ288cIi+8JF99om+JBkG2F6BAznjOxPyAAvm6NOWhNyM9Eo2pgcjcEfoIzZnLf6QVp+2Tm1nBFYkz54lZgTb0/8RX1uHDZ/ZoeGwxrXYcdBY00vwycGk9T6JD3HSev1WHxLisGd2xNizR6XY+EGyGEd0tZzxxzwtQk4I/ZqAAbiy1oScEfbQhHHNj5/DJ768Tv1BCKxInrMehpYDcMW2lG5fGamATcyTw4a+R2744RBHX8SEOKN+a4w/Dri348/r+TE2frzVJ5fMJsbJbFp05FPzFV/A8Bk/jkFXEnybgDXCHiKlNTU9voyUa3aa64zAafLsnA/ueBBLB4R5k+xhiw82NoitsTbT2dzVLYfzTAxILOLDATrjFzw4xPiJuRGLmFFfG5f84eu7sBDb7IUimH0M4x7bBH7OYIAf1mcYMIcQGxv6XtBRm9eN7pM3eYDD6NgvGW9F8mQjjj6IrEPwYcJDZf1VWg7hVi4chJINZJbVCQGW1pT0xGFddujIk1iltZm+5I988ZW9OLIm85Xp8ENe2Rx7vceX98E61nud7xMTG6/zfWrz4xl98mcv7Saa7WktL+wR6kTwhdBHamtfbm5V8uRB3doMNjmziWuxQzJb03EgrT+i7fEgclhj3tRpB2erDmw5GBy4aItf/O/NE/uaP4uDnfVpyYW2VVhPjpk98ZnP5kq6Eg5mT6wWn3xTMD5/5mN0Cw7UxfNAS/6ZMIeYHX3WIuwLQh9h/eg6lo23Dnl+hujoRvGgR29svNfhm4ccW1qIws+P6BO3FoeHtjbPHHlTA30v1EuNXmd9/HJAEPqmtxZ/Jb9mE1v84I+4cc78eT23Tz+mv+etO/Y1/MgDMihhwHrE8qZlXBLwKM1FPTFruUX7ljEY4hNpsY821AcmmTCHxDXZmPXUl829nG5l8uRB4aEpbUptw1nr12EbN50xh4LW247qb8Wt1e5zpIZYL/M86JFAiAnJgQc2UfCDv6ivjWs+a/5Y5/3GsZ/L+uCD/2zOdB4D/JuAgUkJC/OxFw/WEefsLZT6iI0fWnwiWzUT/0oB06v8sxcmV8Xo5ndl8qRIHhbavcI6Hj6/jk1H73Wz+7WDEPOv5UpdJV/UDYki9DM/xLIDms1nOmLWfG75i/lyaLI4NR05RD+ZPXV7IRaS2ZrOMKE13d6W/Iz8WvIkFnZghzCOMfGJTdTfeUxNPEv2gkbLGP2yda1Onry92wngB9Y8fB+D9w4H6Ki/dxddmywXfuuGA7f3gOCLNdmBKyWNLTgh9Et26CEbxB5ssEQfBT/kTxvn4picTef7pmtpWUfdLbatNuTegskef+QJLvjNxOawI37NNza9a67Fu3KOWkrPEnqetyvjH/a9OnlS2JmHhIcUH17YEDbM62b2Y32lX9lsyZG6or+tdRAi60wYI4x5cKMwl/nkwIM3ks1nOnLFH0I/s2nRkeueuDWf+EFqNmfmwCmTvT6p+Qxme+OZfc+Y1MB5NN9Zy7PBM5jNTdXdgTwBiIeNdq+wLttsNowNYfP2+uxtn+WQ6WpxecAQakJqtn6ONWDhhfUIOuZN/DrfB2PIBqHv51r6vLtAWmxrNsTm9pbtd22dzbGO9fgx3eotzwk5kzsyIl9i9orDM9bia+sZbPHR3eYu5JltWKbLAMKOgx3n2BA2j3kkzo8cxwff8qrlQP4IRGfCOFtzBSHgE1wR+lncGTr2spVQyJv8sWfdjHx7xCR3hDp4lpAefr0Pw8rrRvY5EyPjbca6C3lyM+HB4AFBIIk9D4htPG0EhU1B8BvnRo2z2NmP7lA3YmRJy7iUJ/VCDgj4gRmCvrSmpGcNYr5oGZfsZ+vBFKFuhHy9mG7lGo5gSM2I1cd+I1u+wAE7w4j1CGNrsdny0zpfe25bfUy1uwt5GkhsLgKZmq61ZeN5EFifrYFA+Q4fhMTDN3pzY17E55tHtOTkBV1Wg+msVuqlb3rqQtDbgSBuSbCL4v2Z3zu05O3lDjmfzZF62W+E/UbifqJD0GPHGsRi+77pZrRbz/zwnO5Gnj0A4gExssj8sUkQKWQFmWKPLrNt0jUaEefHYPv9Y4/TUsUAAAIMSURBVEwexEcew+IXDzkHwIRx0fh9AhviloR5k/clam6OgO2ntbPKIf6s2F3iviJ5ApyRBSTKuCaeSCFTyMzWQ2hIbb2fw9YEH/hC8ItAlt5+q88DiHjCZLy1TvNCYAUE9jyrLWd1aE2vSp4GMgTGWxY2pnUjIT8IFYH4EIgvSqZHZ8J6fCGWT0tLnogRJi3jlrWyEQIrIcC5WymfXbm8OnkaWJAoJLSXSG191u4lxcyH1/349vZGfuSJiDDf9N/NEeAZRrbKgGQ5o1t2Q+dFnp/hZpMgJ4RNQz5bXaPhQULiZ59E2/uWnjUSIbA6AnbOSnly/jiTpflpepFnGXpIjE1DuPEhttFsKPPl1eUZ1pngB5+I+afPbxkxF73wlj/qNBYCd0eAM8ZzzzNvZ4MxwtyS9Yk8920LG8tmImwshBcFvZfaPH7wicRMmONh8no+CkDvdQf6WiIElkOAM8CzbWeHMbJcopaQyNOQ6Ney4V7OeOZhwpf3wTea0Hud+kJACAxGQOQ5GPAD4eLtExcQKK1ECAiBSQiIPCcBvyMsN8+MQHkLv8PNJaZyKgReFgGR5z22nrfpnkDpQ6r3yF5ZCoEnREDkeZ9NhUDtm0/075O5MhUCT4iAyPMJN/WOJSlnIXA3BESed9sx5SsEhMASCIg8l9gGJSEEhMDdEBB53m3HlG8dAc0KgUEI/A0AAP//WxLACAAAAAZJREFUAwAozffLHdiF7gAAAABJRU5ErkJggg=="

interface NicheCertificateProps {
  recipientName: string
  role?: string
  course: string
  tier?: string
  finalScore?: number
  cohortNumber?: string
  graduationDate?: string
  pillar1Score?: number
  pillar2Score?: number
  pillar3Score?: number
  pillar4Score?: number
  pillar1Weighted?: number
  pillar2Weighted?: number
  pillar3Weighted?: number
  pillar4Weighted?: number
  trainingType?: string
  onClose: () => void
  description?: string
  dateStarted?: string
  dateCompleted?: string
  gradeId?: string
  certificateToken?: string | null
  tokenTable?: 'trainee_grades' | 'niche_training'
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

  .font-cinzel    { font-family: 'Cinzel', serif; }
  .font-playfair  { font-family: 'Playfair Display', serif; }
  .font-poppins   { font-family: 'Poppins', sans-serif; }

  .cert-bg {
    background-color: #FAF9F6;
  }
`;

const ScoreBar = ({ label, score, max }: { label: string; score: number; max: number }) => {
  return (
    <div style={{
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      alignItems: "flex-start",
      width: "100%",
      padding: "10px 8px 10px",
      overflow: "hidden",
      height: "clamp(55px,7vw,75px)",
      boxSizing: "border-box",
    }}>

      {/* Underlay: score/total fills the column height */}
      <span className="font-playfair" style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        fontSize: "clamp(30px,3.6vw,46px)",
        fontWeight: 800,
        color: "rgba(217, 86, 55, 0.25)",
        lineHeight: 1,
        pointerEvents: "none",
        userSelect: "none",
        letterSpacing: "-1px",
        zIndex: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textAlign: "center",
      }}>
        {score.toFixed(0)}<span style={{ fontSize:"0.5em" }}>/{max}</span>
      </span>

      {/* Overlay: label only, sits on top */}
      <span className="font-poppins" style={{
        position: "relative",
        zIndex: 1,
        fontSize: "clamp(7px,0.8vw,10.5px)",
        fontWeight: 600,
        color: "#000",
        whiteSpace: "nowrap",
        lineHeight: 1.2,
        textAlign: "center",
        width: "100%",
      }}>
        {label}
      </span>

    </div>
  );
};



const NicheCertificate: React.FC<NicheCertificateProps> = ({
  recipientName,
  role,
  course,
  tier,
  finalScore,
  cohortNumber,
  graduationDate,
  pillar1Score,
  pillar2Score,
  pillar3Score,
  pillar4Score,
  pillar1Weighted,
  pillar2Weighted,
  pillar3Weighted,
  pillar4Weighted,
  trainingType,
  onClose,
  description,
  dateStarted,
  dateCompleted,
  gradeId,
  certificateToken,
  tokenTable = 'trainee_grades'
}) => {
  const nannyPillars = [
    { name: 'Childcare & Development', weight: 1.8, maxWeighted: 45 },
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping & Systems', weight: 0.6, maxWeighted: 15 },
    { name: 'Cooking & Nutrition', weight: 0.4, maxWeighted: 10 }
  ]

  const houseManagerPillars = [
    { name: 'Professional Conduct', weight: 1.2, maxWeighted: 30 },
    { name: 'Housekeeping & Systems', weight: 1.2, maxWeighted: 30 },
    { name: 'Cooking & Kitchen', weight: 1.0, maxWeighted: 25 },
    { name: 'Childcare Literacy', weight: 0.6, maxWeighted: 15 }
  ]

  const pillars = trainingType === 'nanny' ? nannyPillars : (trainingType === 'house_manager' ? houseManagerPillars : [])
  const pillarScores = [pillar1Score || 0, pillar2Score || 0, pillar3Score || 0, pillar4Score || 0]
  const weightedScores = [pillar1Weighted || 0, pillar2Weighted || 0, pillar3Weighted || 0, pillar4Weighted || 0]

  const [isDownloading, setIsDownloading] = useState(false)

  // QR code state — generated on mount so it's visible in preview AND in PDF
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!gradeId) return

    getOrCreateVerificationUrl(gradeId, certificateToken, tokenTable)
      .then((url) => {
        return QRCode.toDataURL(url, {
          width: 130,  // high-res source; displayed at 65px via CSS
          margin: 1,
          color: { dark: '#d95637', light: '#fff9f7' }  // brand red-orange on warm white
        })
      })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.warn('QR generation failed:', err))
  }, [gradeId, certificateToken])

  const downloadCertificate = async () => {
    setIsDownloading(true)
    try {
      const element = document.getElementById('certificate-content')
      if (!element) {
        alert('Certificate content not found')
        setIsDownloading(false)
        return
      }

      // Get the exact HTML of the certificate element
      const certificateHTML = element.outerHTML
      
      // Create minimal HTML wrapper with the exact certificate
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>NICHE Certificate - ${recipientName}</title>
          <style>
            ${styles}
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #FAF9F6 !important;
              box-sizing: border-box;
              height: 210mm;
              width: 297mm;
              overflow: hidden;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            * {
              background: transparent !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              page-break-inside: avoid !important;
            }
            .cert-bg {
              background: #FAF9F6 !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 297mm !important;
              max-height: 210mm !important;
              aspect-ratio: 1.414 !important;
            }
            #certificate-content {
              width: 297mm !important;
              height: 210mm !important;
              max-width: 297mm !important;
              max-height: 210mm !important;
            }
          </style>
        </head>
        <body>
          ${certificateHTML}
        </body>
        </html>
      `

      // Check if running locally
      const isLocal = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' || 
                     window.location.hostname.includes('192.168') ||
                     window.location.port !== ''
      
      const apiEndpoint = isLocal ? 'http://localhost:3001/generate-pdf' : '/api/generate-pdf'

      // Send to PDF service for PDF generation
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          filename: `${recipientName.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`,
          options: {
            format: 'A4',
            landscape: true,
            printBackground: true,
            margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
            preferCSSPageSize: true,
            width: '297mm',
            height: '210mm',
            scale: 1.0
          }
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${recipientName.replace(/\s+/g, '_')}_NICHE_Certificate.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
        
        console.log('Certificate PDF downloaded successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || 'Certificate generation failed')
      }
    } catch (error) {
      console.error('Certificate generation failed:', error)
      alert(`Certificate generation failed: ${error.message}. Make sure the PDF service is running on localhost:3001`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="relative w-full h-full max-w-7xl max-h-[95vh] overflow-auto">
          
          {/* Close Button and Download - Fixed position */}
          <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
            <button
              onClick={downloadCertificate}
              disabled={isDownloading}
              className={`flex items-center gap-2 bg-[#c5a059] text-white px-4 py-2 rounded-lg transition-colors shadow-lg ${isDownloading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-[#b8944f]'}`}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Certificate
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
            >
              ×
            </button>
          </div>

          {/* Certificate - Exact original styling */}
          <div style={{ minHeight:"100vh", width:"100%", background:"#1a1a1a", display:"flex", justifyContent:"center", alignItems:"flex-start", padding:"40px 16px", boxSizing:"border-box" }}>
            <div style={{ width:"100%", maxWidth:1123, margin:"0 auto", padding:"8px 16px" }}>

              {/* Certificate card — fixed A4-landscape aspect ratio */}
              <div className="cert-bg" style={{
                position:"relative",
                width:"100%",
                aspectRatio:"1.414",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                gap:"3%",
                padding:"6% 8% 6%",
                boxSizing:"border-box",
                overflow:"hidden"
              }} id="certificate-content">

                {/* Concave Corner Certificate Border */}
                {/* Parent container must have: position: relative, overflow: hidden */}
                {/* The viewBox 1414x1000 matches a 1.414 aspect ratio (A4 landscape) */}
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                  viewBox="0 0 1414 1000"
                  preserveAspectRatio="none"
                  fill="none"
                  shapeRendering="crispEdges"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer border - thick solid red-orange line, inset 30 units from edge, concave corner radius 35 */}
                  <path
                    d="M 65,30 L 1349,30 Q 1349,65 1384,65 L 1384,935 Q 1349,935 1349,970 L 65,970 Q 65,935 30,935 L 30,65 Q 65,65 65,30 Z"
                    stroke="#d95637"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Inner border - solid red-orange line, inset 43 units from edge, same concave corner radius 35 */}
                  <path
                    d="M 78,43 L 1336,43 Q 1336,78 1371,78 L 1371,922 Q 1336,922 1336,957 L 78,957 Q 78,922 43,922 L 43,78 Q 78,78 78,43 Z"
                    stroke="#d95637"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>



                {/* ── HEADER ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", marginBottom:"20px" }}>
                  <h1 className="font-cinzel" style={{ fontSize:"clamp(24px,4.2vw,48px)", color:"#000", fontWeight:700, letterSpacing:"0.1em", marginBottom:"12px", lineHeight:1.1 }}>
                    CERTIFICATE OF MERIT
                  </h1>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16 }}>
                    <div style={{ height:1, width:"clamp(50px,8vw,100px)", background:"#d95637" }} />
                    <p className="font-poppins" style={{ fontSize:"clamp(7px,0.85vw,11px)", letterSpacing:"0.2em", color:"#000", textTransform:"uppercase", whiteSpace:"nowrap" }}>
                      Nestara Institute of Care and Hospitality Excellence
                    </p>
                    <div style={{ height:1, width:"clamp(50px,8vw,100px)", background:"#d95637" }} />
                  </div>
                </div>

                {/* ── RECIPIENT ── */}
                <div style={{ textAlign:"center", zIndex:10, width:"100%", maxWidth:800, marginBottom:"20px" }}>
                  <p className="font-playfair" style={{ fontStyle:"italic", fontSize:"clamp(13px,1.5vw,17px)", color:"#000", marginBottom:"4px" }}>
                    This honor is proudly bestowed upon
                  </p>
                  <h2 className="font-playfair" style={{ fontWeight:700, fontSize:"clamp(28px,3.8vw,48px)", color:"#000", marginBottom:"12px", letterSpacing:"0.02em", lineHeight:1.1 }}>
                    {recipientName}
                  </h2>
                  <p className="font-poppins" style={{ fontSize:"clamp(10px,1.05vw,13px)", color:"#000", lineHeight:1.6, maxWidth:650, margin:"0 auto" }}>
                    {tier ? (
                      <>
                        In recognition of her exceptional dedication and outstanding achievement within the{" "}
                        <span className="font-cinzel" style={{ color:"#d95637", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(10px,1.05vw,13px)" }}>{course}</span>
                        . {recipientName.split(' ')[0]} has met the most stringent requirements of the curriculum, exhibiting a level of competency that transcends standard expectations and earns her the rank of{" "}
                        <span className="font-cinzel" style={{ color:"#d95637", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(10px,1.05vw,13px)" }}>{tier}</span>
                      </>
                    ) : (
                      <>
                        In recognition of her exceptional dedication and outstanding achievement in{" "}
                        <span className="font-cinzel" style={{ color:"#d95637", fontWeight:700, letterSpacing:"0.08em", fontSize:"clamp(10px,1.05vw,13px)" }}>{course}</span>. {recipientName.split(' ')[0]} has successfully completed this rigorous curriculum with distinction. She has demonstrated exceptional mastery of core competencies, professional excellence, and an unwavering commitment to growth{description ? `, mastering: ${description}` : '.'}
                      </>
                    )}
                  </p>
                </div>

                {/* ── SCORES + SIGNATURES ── */}
                <div style={{ width:"100%", maxWidth:780, zIndex:10 }}>

                  {/* Scores box - only show for flagship courses */}
                  {tier && (
                    <div style={{ marginBottom:"24px" }}>
                      <h3 className="font-cinzel" style={{ textAlign:"center", fontSize:"clamp(10px,1vw,13px)", fontWeight:700, color:"#000", letterSpacing:"0.15em", marginBottom:"0px" }}>
                        Professional Competency Pillars
                      </h3>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0 8px", alignItems:"stretch" }}>
                        {pillars.map((pillar, index) => (
                          <ScoreBar 
                            key={index}
                            label={pillar.name} 
                            score={parseFloat(weightedScores[index]?.toFixed(1))} 
                            max={pillar.maxWeighted} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Signatures */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"end", padding:"0 40px" }}>
                    <div style={{ width:"200px", textAlign:"center" }}>
                      <div style={{ position:"relative", height:"52px", marginBottom:"8px" }}>
                        <img
                          src={NESTARA_SIG}
                          alt="Nestara Limited Signature"
                          style={{
                            position:"absolute",
                            bottom:"2px",
                            left:"50%",
                            transform:"translateX(-50%)",
                            height:"48px",
                            width:"auto",
                            objectFit:"contain",
                            filter:"invert(27%) sepia(100%) saturate(700%) hue-rotate(190deg) brightness(90%)",
                          }}
                        />
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, borderBottom:"2px solid #000" }} />
                      </div>
                      <span className="font-poppins" style={{ fontSize:"clamp(9px,0.9vw,12px)", color:"#000", fontWeight:500, display:"block", whiteSpace:"nowrap" }}>
                        Nestara Limited
                      </span>
                    </div>

                    {/* QR Verification badge — centred between signatories */}
                    {qrDataUrl && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '6px 8px 5px',
                        border: '1px solid #d95637',
                        borderRadius: 6,
                        background: '#fdf3f0',
                        flexShrink: 0,
                        marginBottom: '-18px',
                      }}>
                        {/* QR code */}
                        <img
                          src={qrDataUrl}
                          width={52}
                          height={52}
                          alt="Verify certificate"
                          style={{ display: 'block' }}
                        />
                        {/* Label below */}
                        <span style={{
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: '5.5px',
                          fontWeight: 600,
                          color: '#000',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                        }}>
                          Scan to Verify
                        </span>
                      </div>
                    )}

                    <div style={{ width:"200px", textAlign:"center" }}>
                      <div style={{ position:"relative", height:"52px", marginBottom:"8px" }}>
                        <img
                          src={LEAD_TRAINER_SIG}
                          alt="Lead Trainer Signature"
                          style={{
                            position:"absolute",
                            bottom:"2px",
                            left:"50%",
                            transform:"translateX(-50%)",
                            height:"48px",
                            width:"auto",
                            objectFit:"contain",
                            filter:"invert(27%) sepia(100%) saturate(700%) hue-rotate(190deg) brightness(90%)",
                          }}
                        />
                        <div style={{ position:"absolute", bottom:0, left:0, right:0, borderBottom:"2px solid #000" }} />
                      </div>
                      <span className="font-poppins" style={{ fontSize:"clamp(9px,0.9vw,12px)", color:"#000", fontWeight:500, display:"block", whiteSpace:"nowrap" }}>
                        Lead Trainer, NICHE
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default NicheCertificate